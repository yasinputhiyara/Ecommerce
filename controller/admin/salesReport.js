const Order = require("../../model/Order");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
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



// const getPdf = async (req, res) => {
//   try {
//     let { startDate, endDate, filter } = req.query;

//     let start, end;
//     const now = new Date();

//     switch (filter) {
//       case "daily":
//         start = new Date();
//         start.setHours(0, 0, 0, 0);
//         end = new Date();
//         end.setHours(23, 59, 59, 999);
//         break;

//       case "weekly":
//         start = new Date();
//         start.setDate(start.getDate() - start.getDay()); // Start of the week (Sunday)
//         start.setHours(0, 0, 0, 0);
//         end = new Date(start);
//         end.setDate(start.getDate() + 6); // End on Saturday
//         end.setHours(23, 59, 59, 999);
//         break;

//       case "monthly":
//         start = new Date(now.getFullYear(), now.getMonth(), 1);
//         end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//         end.setHours(23, 59, 59, 999);
//         break;

//       case "yearly":
//         start = new Date(now.getFullYear(), 0, 1);
//         end = new Date(now.getFullYear(), 11, 31);
//         end.setHours(23, 59, 59, 999);
//         break;

//       case "custom":
//         if (!startDate || !endDate) {
//           return res
//             .status(400)
//             .json({ success: false, message: "Invalid date range" });
//         }
//         start = new Date(startDate);
//         end = new Date(endDate);
//         end.setHours(23, 59, 59, 999); // Ensure full last day is included
//         break;

//       default:
//         start = new Date(0);
//         end = new Date();
//     }

//     // Fetch filtered orders
//     const orders = await Order.find({
//       createdOn: { $gte: start, $lte: end },
//       orderStatus: { $in: ["Delivered", "Completed"] },
//     });

//     if (!orders.length) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No orders found." });
//     }

//     // Generate PDF
//     const doc = new PDFDocument();
//     const fileName = `sales-report-${Date.now()}.pdf`;
//     const stream = fs.createWriteStream(`./public/reports/${fileName}`);

//     doc.pipe(stream);
//     doc.fontSize(16).text("Sales Report", { align: "center" });
//     doc.moveDown();
//     doc.fontSize(12).text(`Filter: ${filter}`);
//     doc.text(`Total Sales: ${orders.length}`);
//     doc.text(
//       `Total Revenue: ${orders.reduce(
//         (acc, order) => acc + order.totalPrice,
//         0
//       )}`
//     );
//     doc.text(
//       `Total Discount: ${orders.reduce(
//         (acc, order) => acc + order.discount,
//         0
//       )}`
//     );
//     doc.moveDown();

//     orders.forEach((order) => {
//       doc.text(`Order ID: ${order._id}`);
//       doc.text(`Date: ${order.createdOn.toDateString()}`);
//       doc.text(`Total: ${order.totalPrice}`);
//       doc.text(`Discount: ${order.discount}`);
//       doc.moveDown();
//     });

//     doc.end();

//     stream.on("finish", () => {
//       res.download(`./public/reports/${fileName}`);
//     });
//   } catch (error) {
//     console.error("PDF Generation Error:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

// const getExcel = async (req, res) => {
//   try {
//     let { startDate, endDate, filter } = req.query;
//     let start, end;
//     const now = new Date();

//     switch (filter) {
//       case "daily":
//         start = new Date();
//         start.setHours(0, 0, 0, 0);
//         end = new Date();
//         end.setHours(23, 59, 59, 999);
//         break;

//       case "weekly":
//         start = new Date();
//         start.setDate(start.getDate() - start.getDay()); // Start of the week (Sunday)
//         start.setHours(0, 0, 0, 0);
//         end = new Date(start);
//         end.setDate(start.getDate() + 6); // End on Saturday
//         end.setHours(23, 59, 59, 999);
//         break;

//       case "monthly":
//         start = new Date(now.getFullYear(), now.getMonth(), 1);
//         end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//         end.setHours(23, 59, 59, 999);
//         break;

//       case "yearly":
//         start = new Date(now.getFullYear(), 0, 1);
//         end = new Date(now.getFullYear(), 11, 31);
//         end.setHours(23, 59, 59, 999);
//         break;

//       case "custom":
//         if (!startDate || !endDate) {
//           return res
//             .status(400)
//             .json({ success: false, message: "Invalid date range" });
//         }
//         start = new Date(startDate);
//         end = new Date(endDate);
//         end.setHours(23, 59, 59, 999); // Ensure full last day is included
//         break;

//       default:
//         start = new Date(0);
//         end = new Date();
//     }

//     const orders = await Order.find({
//       createdOn: { $gte: start, $lte: end },
//       orderStatus: { $in: ["Delivered", "Completed"] },
//     });

//     if (!orders.length) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No orders found." });
//     }

//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Sales Report");

//     sheet.columns = [
//       { header: "Order ID", key: "_id", width: 25 },
//       { header: "Date", key: "createdOn", width: 20 },
//       { header: "Total Amount", key: "totalPrice", width: 15 },
//       { header: "Discount", key: "discount", width: 15 },
//     ];

//     orders.forEach((order) => {
//       sheet.addRow({
//         _id: order._id.toString(),
//         createdOn: order.createdOn.toDateString(),
//         totalPrice: order.totalPrice,
//         discount: order.discount,
//       });
//     });

//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=sales-report.xlsx"
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     console.error("Excel Generation Error:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };




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

    console.log("Filter value:", filter);

    const orders = await Order.find({
      createdOn: { $gte: start, $lte: end },
      orderStatus: { $in: ["Delivered", "Completed"] },
    });

    if (!orders.length) return res.status(404).json({ success: false, message: "No orders found." });

    const doc = new PDFDocument();
    const fileName = `sales-report-${Date.now()}.pdf`;
    const filePath = `./public/reports/${fileName}`;
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);
    doc.fontSize(16).text("Sales Report", { align: "center" }).moveDown();
    doc.fontSize(12).text(`Filter: ${filter}`).text(`Total Sales: ${orders.length}`);
    doc.text(`Total Revenue: ${orders.reduce((acc, order) => acc + order.totalPrice, 0)}`);
    doc.text(`Total Discount: ${orders.reduce((acc, order) => acc + order.discount, 0)}`).moveDown();

    orders.forEach(order => {
      doc.text(`Order ID: ${order._id}`).text(`Date: ${order.createdOn.toDateString()}`);
      doc.text(`Total: ${order.totalPrice}`).text(`Discount: ${order.discount}`).moveDown();
    });

    doc.end();
    stream.on("finish", () => {
      res.download(filePath, () => fs.unlinkSync(filePath));
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

    if (!orders.length) return res.status(404).json({ success: false, message: "No orders found." });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "Order ID", key: "_id", width: 25 },
      { header: "Date", key: "createdOn", width: 20 },
      { header: "Total Amount", key: "totalPrice", width: 15 },
      { header: "Discount", key: "discount", width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };
    orders.forEach(order => {
      sheet.addRow({
        _id: order._id.toString(),
        createdOn: order.createdOn.toDateString(),
        totalPrice: order.totalPrice,
        discount: order.discount,
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Generation Error:", error.message);
    res.status(500).json({ success: false, message: "Error generating Excel file." });
  }
};
module.exports = {
  getSalesReport,
  getPdf,
  getExcel,
};
