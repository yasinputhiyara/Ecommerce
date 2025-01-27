const Wallet = require('../../model/Wallet');

module.exports = {
  async getWallet(req, res) {
    try {
      const user = req.session.user;
      const userId = req.session.user?._id;

      if (!userId) {
        return res.redirect('/login');
      }

      const page = parseInt(req.query.page) || 1; // Default page 1
      const limit = 5; // Number of transactions per page

      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        // Render page with default values if no wallet exists
        return res.render('user/account/wallet', {
          user,
          balance: 0,
          totalIncome: 0,
          totalSpent: 0,
          transactionHistory: [],
          currentPage: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        });
      }

      // Calculate total income and total spent
      const totalIncome = wallet.transactionHistory
        .filter((t) => t.transactionType === 'CREDIT')
        .reduce((sum, t) => sum + t.transactionAmount, 0);

      const totalSpent = wallet.transactionHistory
        .filter((t) => t.transactionType === 'DEBIT')
        .reduce((sum, t) => sum + t.transactionAmount, 0);

      // Pagination values
      const totalTransactions = wallet.transactionHistory.length;
      const totalPages = Math.ceil(totalTransactions / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      // Paginated transaction history
      const paginatedTransactions = wallet.transactionHistory
        .sort((a, b) => b.transactionDate - a.transactionDate) // Sort by date descending
        .slice(startIndex, endIndex);

      // Render wallet page
      res.render('user/account/wallet', {
        user,
        balance: wallet.balance,
        totalIncome,
        totalSpent,
        transactionHistory: paginatedTransactions,
        currentPage: page,
        totalPages,
        hasNextPage: endIndex < totalTransactions,
        hasPrevPage: startIndex > 0
      });
    } catch (error) {
      console.error('Error in getWallet:', error);
      return res.status(500).render('error', { message: 'Internal server error' });
    }
  }
};
