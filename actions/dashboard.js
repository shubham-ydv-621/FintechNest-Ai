"use server";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";    
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => {
    const serialized={...obj};

    if(obj.balance){
        serialized.balance = obj.balance.toNumber();
    }

    return serialized;
}

export async function CreateAccount(data){

    try {
        const {userId}=await auth();
        if(!userId){
            throw new Error("unautharized");
        }

        const user=await db.user.findUnique({
            where:{
                clerkUserId:userId
            }
        });

        if(!user){
            throw new Error("User not found");
        }
        //balance to float

        const balanceFloat = parseFloat(data.balance);
           if(isNaN(balanceFloat) ){
            throw new Error("Invalid balance amount");
    } 

    //chck if it is users first account

    const existingAccounts = await db.account.findMany({
        where: {
            userId: user.id
        },
    });

    const shouldBeDefault = existingAccounts.length === 0 ? true : data.isdefault;



    //for seting up default account
    if(shouldBeDefault){
        await db.account.updateMany({
            where: {
                userId: user.id,
                isDefault: true
            },
            data: {
                isDefault: false
            }
        });
    }
    const account = await db.account.create({
        data: {
            ...data,
            userId: user.id,
            balance: balanceFloat,
            isDefault: shouldBeDefault
        }
    });
    const serializedAccount=serializeTransaction(account);
    revalidatePath("/dashboard");
    return{success:true,data:serializedAccount};
}catch (error) {
        throw new Error(error.message);
    }
}