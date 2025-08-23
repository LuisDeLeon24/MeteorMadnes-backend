import Account from "../accounts/account.model.js";

export const generateUniqueAccountNumber = async () => {
    let accountNumber;
    let exists = true;

    while (exists) {
        accountNumber = "";
        for (let i = 0; i < 10; i++) {
            accountNumber += Math.floor(Math.random() * 10);
        }

        const existing = await Account.findOne({ accountNumber });
        exists = !!existing;
    }

    return accountNumber;
};