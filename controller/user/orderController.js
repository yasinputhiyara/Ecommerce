const Orders = require("../../model/Order");
const Address = require("../../model/Address");
const Wallet = require("../../model/Wallet");
const { Product } = require("../../model/Product");
const PDFDocument = require('pdfkit');
const fs = require('fs');

const loadOrders = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect("/login");
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Orders per page
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalOrders = await Orders.countDocuments({ userId: user._id });
    const totalPages = Math.ceil(totalOrders / limit);

    // Get paginated orders
    const orders = await Orders.find({ userId: user._id })
      .populate("orderedItems.product")
      .populate("address")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    res.render("user/account/orders", {
      user,
      orders,
      path: "/orders",
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Order Page Error:", error);
    res.status(500).send("An error occurred while loading the orders.");
  }
};



const loadOrderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect("/login");
    }

    const orderId = req.params.id;

    // Find the order and populate product details including productImages
    const order = await Orders.findOne({ _id: orderId }).populate({
      path: "orderedItems.product",
      select: "productName salePrice productImages", // Include required fields
    });

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    console.log("Order Details:", order);

    // Extract the address ID from the order
    // const addressId = order.address;
    // console.log("Order AddressId:", addressId);
    // console.log("Order Address name :", order.address.name);

    // Extract products and their images
    const products = order.orderedItems.map((item) => ({
      productName: item.product.productName,
      salePrice: item.product.salePrice,
      productImages: item.product.productImages,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    }));

    // Render the order details page
    res.render("user/account/order-detail", {
      user,
      order,
      products,
      path:'/orders'
    });
  } catch (error) {
    console.error("Order Details Page Error:", error);
    res.status(500).send("An error occurred while loading the order details.");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    // const { cancellationReason } = req.body; // Get cancellation reason from request
    const  cancellationReason  = req.body.reason;

    console.log("Cancelling order:", orderId);

    // Find the order and populate product details
    const order = await Orders.findById(orderId).populate(
      "orderedItems.product"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Check if the order is already cancelled
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled.",
      });
    }

    // Keep track of all products to be updated
    const productsToUpdate = new Map();

    // Update inventory and mark each item as cancelled
    for (const item of order.orderedItems) {
      if (item.orderStatus !== "Cancelled") {
        console.log("Processing item:", {
          productId: item.product._id,
          size: item.size,
          quantity: item.quantity,
        });

        // Find product or use cached version
        let product;
        if (productsToUpdate.has(item.product._id.toString())) {
          product = productsToUpdate.get(item.product._id.toString());
        } else {
          product = await Product.findById(item.product._id);
          if (product) {
            productsToUpdate.set(item.product._id.toString(), product);
          }
        }

        if (!product) {
          console.log(`Product not found for item: ${item.product._id}`);
          continue;
        }

        // Update inventory
        const variant = product.variants.find(
          (v) => v.size.toLowerCase() === item.size.toLowerCase()
        );

        if (variant) {
          variant.quantity += item.quantity;
        }

        // Mark item as cancelled and set paymentStatus to Refunded
        item.orderStatus = "Cancelled";
        if (order.paymentMethod === "razorpay") {
          item.paymentStatus = "Refunded";
        } else {
          item.paymentStatus = "Failed";
        }

        // item.paymentStatus = "Refunded";

        item.cancellationsReason = cancellationReason || "No reason provided"; // Save cancellation reason
      }
    }

    // Update order status and save cancellation reason
    order.orderStatus = "Cancelled";
    order.cancellationsReason = cancellationReason || "No reason provided";

    // Refund logic if payment method is Razorpay
    if (order.paymentMethod === "razorpay" && order.paymentStatus === "Paid") {
      let wallet = await Wallet.findOne({ userId: order.userId });

      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = new Wallet({
          userId: order.userId,
          balance: 0,
          transactionHistory: [],
        });
      }

      // Refund the amount to the wallet
      wallet.balance += order.totalPrice;
      wallet.transactionHistory.push({
        transactionType: "CREDIT",
        transactionAmount: order.totalPrice,
        description: `Refund for Order ID: ${order._id}`,
      });

      await wallet.save();

      order.paymentStatus = "Refunded";
    }

    order.totalPrice = 0;
    order.finalAmount = 0;

    // Save all modified products and the order
    const savePromises = [
      ...Array.from(productsToUpdate.values()).map((product) => product.save()),
      order.save(),
    ];

    await Promise.all(savePromises);

    return res.status(200).json({
      success: true,
      message: "Order cancelled and refund processed successfully.",
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


const cancelProduct = async (req, res) => {
  try {
    const { orderId, productIndex } = req.params;
    const  cancellationReason  = req.body.reason;
    // const { cancellationReason } = req.body;
    // console.log("Cancelling product reason:", cancellationReason   );

    // console.log("Cancelling product:", { orderId, productIndex });

    const order = await Orders.findById(orderId).populate(
      "orderedItems.product"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const index = parseInt(productIndex);
    if (isNaN(index) || index < 0 || index >= order.orderedItems.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid product index.",
      });
    }

    const item = order.orderedItems[index];

    if (item.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Product is already cancelled.",
      });
    }

    const product = await Product.findById(item.product._id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const variant = product.variants.find(
      (v) => v.size.toLowerCase() === item.size.toLowerCase()
    );

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Product variant not found.",
      });
    }

    // Restore inventory
    variant.quantity += item.quantity;

    // Calculate refund amount
    const refundAmount = item.price * item.quantity;

    // Update the subtotal first
    order.subtotal -= refundAmount;

    // Ensure subtotal does not go below zero
    if (order.subtotal < 0) {
      order.subtotal = 0;
    }

    // Recalculate totalPrice after discount
    order.totalPrice = Math.max(order.subtotal - order.discount, 0);

    // Update product orderStatus
    order.orderedItems[index].orderStatus = "Cancelled";
    order.orderedItems[index].paymentStatus = "Refunded";
    order.orderedItems[index].cancellationsReason =
      cancellationReason || "No reason provided";

    // Process refund if payment was via Razorpay
    if (order.paymentMethod === "razorpay" && order.paymentStatus === "Paid") {
      let wallet = await Wallet.findOne({ userId: order.userId });

      if (!wallet) {
        wallet = new Wallet({
          userId: order.userId,
          balance: 0,
          transactionHistory: [],
        });
      }

      wallet.balance += refundAmount;
      wallet.transactionHistory.push({
        transactionType: "CREDIT",
        transactionAmount: refundAmount,
        description: `Refund for Product in Order ID: ${order._id}`,
      });

      await wallet.save();
    }

    // Check if at least one product is still "Pending"
    const hasActiveItems = order.orderedItems.some(
      (item) => item.orderStatus !== "Cancelled"
    );
    
    if (!hasActiveItems) {
      order.orderStatus = "Cancelled";
      order.paymentStatus = "Refunded";
    }

    // Save the changes
    await Promise.all([product.save(), order.save()]);

    return res.status(200).json({
      success: true,
      message: "Product cancelled successfully.",
      updatedSubtotal: order.subtotal,
      updatedTotal: order.totalPrice,
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    console.error("Error cancelling product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};


const returnSingleProduct = async (req, res) => {
  try {
    const { orderId, productIndex } = req.params;
    const  returnReason = req.body.reason

    console.log("Returning single product:", { orderId, productIndex, returnReason });

    // Find the order
    const order = await Orders.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Validate product index
    const index = parseInt(productIndex);
    if (isNaN(index) || index < 0 || index >= order.orderedItems.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid product index.",
      });
    }

    const item = order.orderedItems[index];

    // Check if the product is already in "Return Request" state
    if (item.orderStatus === "Return Request") {
      return res.status(400).json({
        success: false,
        message: "Return request is already placed for this product.",
      });
    }

    // Update the product status to "Return Request"
    item.orderStatus = "Return Request";
    item.returnReason = returnReason || "No reason provided";

    // Check if all products in the order are now in "Return Request"
    const allReturned = order.orderedItems.every(
      (product) => product.orderStatus === "Return Request"
    );

    if (allReturned) {
      order.orderStatus = "Return Request";
      order.returnReason = returnReason || "No reason provided";
    }

    // Save the order
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Return request for product submitted successfully.",
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    console.error("Error processing single product return:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};


const InvoiceDownload = async (req, res) => {
  try {
      const order = await Orders.findById(req.params.orderId).populate('orderedItems.product');

      if (!order) {
          return res.status(404).send('Order not found');
      }

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `invoice_${order.orderId}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      doc.pipe(res);

      // Add company logo or name
      doc.fontSize(20).text('SHOEZO', { align: 'center' });
      doc.moveDown();

      // Invoice header
      doc.fontSize(16).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Create a box for order details
      doc.rect(50, doc.y, 500, 80)
         .stroke();

      const startY = doc.y + 10;
      
      // Left side info
      doc.fontSize(10)
         .text('Order Details:', 60, startY)
         .text(`Order ID: ${order.orderId}`, 60, startY + 15)
         .text(`Order Date: ${new Date(order.createdOn).toLocaleDateString()}`, 60, startY + 30);

      // Right side info (if you have customer details)
      doc.fontSize(10)
         .text('Customer Details:', 300, startY)
         .text(`Name: ${order.address?.name || 'N/A'}`, 300, startY + 15)
         .text(`Phone: ${order.address?.phone || 'N/A'}`, 300, startY + 30);

      doc.moveDown(5);

      // Table Header
      const tableTop = doc.y + 10;
      const itemCodeX = 50;
      const descriptionX = 150;
      const sizeX = 280;
      const quantityX = 350;
      const priceX = 400;
      const totalX = 480;

      // Draw table header
      doc.rect(50, tableTop - 5, 500, 20).fill('#E4E4E4');
      doc.fillColor('#000000');
      doc.fontSize(10)
         .text('Item', itemCodeX, tableTop)
         .text('Description', descriptionX, tableTop)
         .text('Size', sizeX, tableTop)
         .text('Qty', quantityX, tableTop)
         .text('Price', priceX, tableTop)
         .text('Total', totalX, tableTop);

      // Draw lines
      doc.moveTo(50, tableTop + 15)
         .lineTo(550, tableTop + 15)
         .stroke();

      let yPosition = tableTop + 25;

      // Table rows
      order.orderedItems.forEach((item, index) => {
          // Check if we need a new page
          if (yPosition > 700) {
              doc.addPage();
              yPosition = 50;
              
              // Redraw header on new page
              doc.rect(50, yPosition - 5, 500, 20).fill('#E4E4E4');
              doc.fillColor('#000000');
              doc.fontSize(10)
                 .text('Item', itemCodeX, yPosition)
                 .text('Description', descriptionX, yPosition)
                 .text('Size', sizeX, yPosition)
                 .text('Qty', quantityX, yPosition)
                 .text('Price', priceX, yPosition)
                 .text('Total', totalX, yPosition);
              
              yPosition += 20;
          }

          // Add zebra striping
          if (index % 2 === 1) {
              doc.rect(50, yPosition - 5, 500, 20).fill('#F9F9F9');
          }

          doc.fillColor('#000000')
             .fontSize(10)
             .text(item.product.productId || 'N/A', itemCodeX, yPosition)
             .text(item.product.productName, descriptionX, yPosition, { width: 120 })
             .text(item.size, sizeX, yPosition)
             .text(item.quantity.toString(), quantityX, yPosition)
             .text(`₹${item.price.toFixed(2)}`, priceX, yPosition)
             .text(`₹${(item.price * item.quantity).toFixed(2)}`, totalX, yPosition);

          yPosition += 20;
      });

      // Draw bottom line
      doc.moveTo(50, yPosition)
         .lineTo(550, yPosition)
         .stroke();

      // Summary section
      yPosition += 20;
      const summaryX = 400;
      
      doc.fontSize(10)
         .text('Subtotal:', summaryX, yPosition)
         .text(`₹${order.subtotal.toFixed(2)}`, totalX, yPosition);
      
      yPosition += 20;
      doc.text('Discount:', summaryX, yPosition)
         .text(`-₹${order.discount.toFixed(2)}`, totalX, yPosition);
      
      yPosition += 20;
      doc.text('Shipping Charge:', summaryX, yPosition)
         .text(`₹${order.shippingCharge.toFixed(2) || 0}`, totalX, yPosition);
      
      yPosition += 20;
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Total Amount:', summaryX, yPosition)
         .text(`₹${order.totalPrice.toFixed(2)}`, totalX, yPosition);

      // Footer
      const footerTop = doc.page.height - 100;
      doc.fontSize(10)
         .font('Helvetica')
         .text('Thank you for your business!', 50, footerTop, { align: 'center' })
         .text('For any queries, please contact support@yourcompany.com', 50, footerTop + 15, { align: 'center' });

      doc.end();
  } catch (error) {
      console.error('Error generating invoice:', error);
      res.status(500).send('Error generating invoice');
  }
};






module.exports = {
  loadOrders,
  loadOrderDetails,
  cancelOrder,
  cancelProduct,
  returnSingleProduct,
  InvoiceDownload
};
