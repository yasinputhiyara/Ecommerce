const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  transactionHistory: [
    {
      transactionType: {
        type: String,
        enum: ["CREDIT", "DEBIT"],
        required: true,
      },
      transactionAmount: {
        type: Number,
        required: true,
      },
      transactionDate: {
        type: Date,
        default: Date.now,
      },
      reference: {
        type: String,
      },
      description: {
        type: String,
        default: "",
      },
    },
  ],
}, { timestamps: true });

walletSchema.index({ "transactionHistory.reference": 1 }, { unique: true, sparse: true });

walletSchema.pre("save", function (next) {
  if (this.balance < 0) {
    return next(new Error("Wallet balance cannot be negative."));
  }
  next();
});

walletSchema.methods.addTransaction = async function (transaction) {
  if (transaction.transactionType === "DEBIT" && this.balance < transaction.transactionAmount) {
    throw new Error("Insufficient balance for this transaction.");
  }

  this.transactionHistory.push(transaction);

  if (transaction.transactionType === "CREDIT") {
    this.balance += transaction.transactionAmount;
  } else if (transaction.transactionType === "DEBIT") {
    this.balance -= transaction.transactionAmount;
  }

  await this.save();
};

walletSchema.query.byUser = function (userId) {
  return this.findOne({ userId });
};

walletSchema.query.transactionHistory = function (userId, type) {
  return this.findOne({ userId, "transactionHistory.transactionType": type });
};

walletSchema.methods.paginateTransactions = function (page = 1, limit = 10) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  return this.transactionHistory.slice(startIndex, endIndex);
};

walletSchema.methods.checkLowBalance = function (threshold = 100) {
  return this.balance < threshold;
};

walletSchema.statics.performTransaction = async function (userId, transaction) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await this.findOne({ userId }).session(session);

    if (!wallet) {
      throw new Error("Wallet not found.");
    }

    await wallet.addTransaction(transaction);
    await session.commitTransaction();

    return wallet;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = mongoose.model("Wallets", walletSchema);
