import { Wallet, WalletTransaction } from "../../model/relations.js";
/**
 * Get or create a wallet for a user
 */
export const getOrCreateWallet = async (userId, transaction) => {
    const [wallet] = await Wallet.findOrCreate({
        where: { userId },
        defaults: {
            userId,
            balance: 0.00,
            currency: "INR",
            isActive: true,
        },
        transaction,
    });
    return wallet;
};
/**
 * Get current wallet balance for a user
 */
export const getWalletBalance = async (userId) => {
    const wallet = await getOrCreateWallet(userId);
    return Number(wallet.balance);
};
/**
 * Credit amount to buyer's wallet (thread-safe, locked)
 */
export const creditWallet = async (params, transaction) => {
    const { userId, amount, referenceId, referenceType, category, description } = params;
    if (amount <= 0) {
        throw new Error("Credit amount must be greater than zero.");
    }
    // Lock the wallet row to prevent race conditions
    const wallet = await Wallet.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    if (!wallet) {
        throw new Error(`Wallet not found for user: ${userId}`);
    }
    if (!wallet.isActive) {
        throw new Error("Wallet is inactive.");
    }
    const currentBalance = Number(wallet.balance);
    const newBalance = currentBalance + amount;
    // Update balance
    await wallet.update({ balance: newBalance }, { transaction });
    // Write to ledger
    await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        amount,
        type: "CREDIT",
        category,
        status: "SUCCESS",
        referenceId: String(referenceId),
        referenceType,
        description,
    }, { transaction });
    return wallet;
};
/**
 * Debit amount from buyer's wallet (thread-safe, locked)
 */
export const debitWallet = async (params, transaction) => {
    const { userId, amount, referenceId, referenceType, category, description } = params;
    if (amount <= 0) {
        throw new Error("Debit amount must be greater than zero.");
    }
    // Lock the wallet row to prevent race conditions
    const wallet = await Wallet.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    if (!wallet) {
        throw new Error(`Wallet not found for user: ${userId}`);
    }
    if (!wallet.isActive) {
        throw new Error("Wallet is inactive.");
    }
    const currentBalance = Number(wallet.balance);
    if (currentBalance < amount) {
        throw new Error("Insufficient wallet balance.");
    }
    const newBalance = currentBalance - amount;
    // Update balance
    await wallet.update({ balance: newBalance }, { transaction });
    // Write to ledger
    await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        amount,
        type: "DEBIT",
        category,
        status: "SUCCESS",
        referenceId: String(referenceId),
        referenceType,
        description,
    }, { transaction });
    return wallet;
};
/**
 * Get paginated transactions history for a user
 */
export const getWalletTransactions = async (userId, page = 1, limit = 20) => {
    const wallet = await getOrCreateWallet(userId);
    const offset = (page - 1) * limit;
    const result = await WalletTransaction.findAndCountAll({
        where: { walletId: wallet.id },
        limit: Number(limit),
        offset: Number(offset),
        order: [["createdAt", "DESC"]],
    });
    return {
        transactions: result.rows,
        total: result.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(result.count / Number(limit)),
    };
};
