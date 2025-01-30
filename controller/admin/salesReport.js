

const Order = require('../../model/Order')

const getSalesReport = async (req, res) => {
    try {
        let { startDate, endDate, filter } = req.query;

        // Set date range based on filter
        let start, end = new Date();
        switch (filter) {
            case "daily":
                start = new Date();
                start.setHours(0, 0, 0, 0);
                break;
            case "weekly":
                start = new Date();
                start.setDate(start.getDate() - 7);
                break;
            case "monthly":
                start = new Date();
                start.setMonth(start.getMonth() - 1);
                break;
            case "yearly":
                start = new Date();
                start.setFullYear(start.getFullYear() - 1);
                break;
            case "custom":
                start = new Date(startDate);
                end = new Date(endDate);
                break;
            default:
                start = new Date(0);
        }

        // Fetch sales data from MongoDB
        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus: { $in: ["Delivered", "Completed"] }
        });

        // Calculate statistics
        const totalSales = orders.length;
        const totalRevenue = orders.reduce((acc, order) => acc + order.finalAmount, 0);
        const totalDiscount = orders.reduce((acc, order) => acc + order.discountAmount, 0);

        res.json({
            success: true,
            totalSales,
            totalRevenue,
            totalDiscount,
            orders
        });
    } catch (error) {
        console.error("Sales Report Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports={
    getSalesReport
}
