import User from '../users/user.model.js'
import Role from '../role/role.model.js';
import Account from '../accounts/account.model.js'

export const validRole = async(role = '') => {
    if (role === "") return;  

    const existRole = await Role.findOne({ role });
    if (!existRole) {
        throw new Error(`Rol ${role} does not exist in the database`);
    }
}

export const existentEmail = async(email = '')=>{
    const existEmail = await User.findOne({email});
    if (existEmail) {
        throw new Error (`Email ${email} already exists in the database`)
    }
}

export const existUserById = async(id = ``)=>{
    const existUser = await User.findById(id);
    if (!existUser) {
        throw new Error(`ID  ${id} does not exist in the database`)
    }
}

export const existAccountById = async(accountId = ``)=>{
    const account = await Account.findById(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} does not exist`);
        }
}

export const destinationAccountById = async(destinationAccountId = ``)=>{
    const destinationAccount = await Account.findById(destinationAccountId);
        if (!destinationAccount) {
            throw new Error(`Destination account ${destinationAccountId} does not exist`);
        }
}

export const existUsername = async(username = '') => {
    const existUsername = await User.findOne({username});
    if(existUsername){
        throw new Error(`Username ${username} already use`)
    }
}