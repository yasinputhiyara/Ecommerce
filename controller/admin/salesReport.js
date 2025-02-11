const Order = require("../../model/Order");
const PDFDocument = require("pdfkit");
// require("pdfkit-table");
const ExcelJS = require("exceljs");
const fs = require("fs");

const getSalesReport = async (req, res) => {
  try {
    let { startDate, endDate, filter } = req.query;

    let start, end;
    const now = new Date();

    switch (filter) {
      case "daily":
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case "weekly":
        start = new Date();
        start.setDate(start.getDate() - start.getDay()); // Start of the week (Sunday)
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6); // End on Saturday
        end.setHours(23, 59, 59, 999);
        break;

      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case "yearly":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        break;

      case "custom":
        if (!startDate || !endDate) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid date range" });
        }
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Ensure full last day is included
        break;

      default:
        start = new Date(0);
        end = new Date();
    }

    // Fetch orders based on the filtered date range
    const orders = await Order.find({
      createdOn: { $gte: start, $lte: end },
      orderStatus: { $in: ["Delivered", "Completed"] },
    });

    // Calculate sales summary
    const totalSales = orders.length;
    const totalRevenue = orders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );
    const totalDiscount = orders.reduce(
      (acc, order) => acc + order.discount,
      0
    );
    const totalCouponDiscount = orders.reduce(
      (acc, order) => (order.couponApplied ? acc + order.discount : acc),
      0
    );

    // Check if it's an API request (AJAX call) or a full page render
    if (req.xhr || req.headers.accept.includes("json")) {
      return res.json({
        success: true,
        totalSales,
        totalRevenue,
        totalDiscount,
        totalCouponDiscount,
        orders,
      });
    }

    // If not an AJAX request, render the page normally
    res.render("admin/view-report", {
      salesData: {
        totalSales,
        totalRevenue,
        totalDiscount,
        totalCouponDiscount,
        orders,
      },
    });
  } catch (error) {
    console.error("Sales Report Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getDateRange = (filter, startDate, endDate) => {
  const now = new Date();
  let start, end;

  switch (filter) {
    case "daily":
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;

    case "weekly":
      start = new Date();
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case "monthly":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "yearly":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;

    case "custom":
      if (!startDate || !endDate) throw new Error("Invalid date range");
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      break;

    default:
      start = new Date(0);
      end = new Date();
  }

  return { start, end };
};

const getPdf = async (req, res) => {
  try {
    const { startDate, endDate, filter } = req.query;
    const { start, end } = getDateRange(filter, startDate, endDate);

    const orders = await Order.find({
      createdOn: { $gte: start, $lte: end },
      orderStatus: { $in: ["Delivered", "Completed"] },
    });

    if (!orders.length) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found." });
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const fileName = `sales-report-${Date.now()}.pdf`;
    const filePath = `./public/reports/${fileName}`;
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header Section
    doc.fontSize(20).text("Sales Report", { align: "center" }).moveDown();
    doc
      .fontSize(12)
      .text(`Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
    doc.text(`Total Sales: ${orders.length}`);
    doc.text(
      `Total Revenue: ₹${orders
        .reduce((acc, order) => acc + order.totalPrice, 0)
        .toFixed(2)}`
    );
    doc
      .text(
        `Total Discount: ₹${orders
          .reduce((acc, order) => acc + order.discount, 0)
          .toFixed(2)}`
      )
      .moveDown();

    // Table Headers
    const tableTop = 200;
    const columns = {
      orderId: { x: 50, width: 150 },
      date: { x: 200, width: 100 },
      totalPrice: { x: 300, width: 100 },
      discount: { x: 400, width: 100 }
    };

    // Draw Headers
    doc
      .font('Helvetica-Bold')
      .fontSize(12);
    
    doc.text('Order ID', columns.orderId.x, tableTop);
    doc.text('Date', columns.date.x, tableTop);
    doc.text('Total Price (₹)', columns.totalPrice.x, tableTop);
    doc.text('Discount (₹)', columns.discount.x, tableTop);

    // Draw Rows
    let yPosition = tableTop + 25;
    
    orders.forEach((order, i) => {
      if (yPosition > 750) { // Check if we need a new page
        doc.addPage();
        yPosition = 50; // Reset Y position for new page
      }

      const rowBackground = i % 2 === 0 ? '#ffffff' : '#f5f5f5';
      
      // Draw row background
      doc
        .rect(40, yPosition - 5, 520, 20)
        .fill(rowBackground);
      
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('black');

      doc.text(order.orderId.toString(), columns.orderId.x, yPosition, {
        width: columns.orderId.width,
        truncate: true
      });
      
      doc.text(order.createdOn.toDateString(), columns.date.x, yPosition, {
        width: columns.date.width
      });
      
      doc.text(order.totalPrice.toFixed(2), columns.totalPrice.x, yPosition, {
        width: columns.totalPrice.width,
        align: 'right'
      });
      
      doc.text(order.discount.toFixed(2), columns.discount.x, yPosition, {
        width: columns.discount.width,
        align: 'right'
      });

      yPosition += 20;
    });

    // Add borders around the table
    doc
      .rect(40, tableTop - 10, 520, yPosition - tableTop + 10)
      .stroke();

    doc.end();

    stream.on('finish', () => {
      res.download(filePath, () => fs.unlinkSync(filePath)); // Cleanup after download
    });

  } catch (error) {
    console.error("PDF Generation Error:", error.message);
    res.status(500).json({ success: false, message: "Error generating PDF." });
  }
};

const getExcel = async (req, res) => {
  try {
    const { startDate, endDate, filter } = req.query;
    const { start, end } = getDateRange(filter, startDate, endDate);

    const orders = await Order.find({
      createdOn: { $gte: start, $lte: end },
      orderStatus: { $in: ["Delivered", "Completed"] },
    });

    if (!orders.length)
      return res
        .status(404)
        .json({ success: false, message: "No orders found." });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "Order ID", key: "_id", width: 25 },
      { header: "Date", key: "createdOn", width: 20 },
      { header: "Total Amount", key: "totalPrice", width: 15 },
      { header: "Discount", key: "discount", width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };
    orders.forEach((order) => {
      sheet.addRow({
        _id: order._id.toString(),
        createdOn: order.createdOn.toDateString(),
        totalPrice: order.totalPrice,
        discount: order.discount,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Generation Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Error generating Excel file." });
  }
};
module.exports = {
  getSalesReport,
  getPdf,
  getExcel,
};
