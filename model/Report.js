const mongoose = require('mongoose');


const SalesReportSchema = new mongoose.Schema({
    totalRevenue: Number,
    totalOrders: Number,
    averageOrderValue: Number,
    topSellingProducts: [{
      productId: String,
      name: String,
      quantity: Number,
      revenue: Number
    }],
    dateRange: {
      start: Date,
      end: Date
    }
  });

  const Sales= new mongoose.model('sale', SalesReportSchema);
module.exports = Sales