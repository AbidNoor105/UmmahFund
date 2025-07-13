import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs/promises';
import data from "./data.json" assert { type: "json" };

const API_KEY = "AIzaSyBZSUtjX1HLWfc8xnzpx6pdCD9H1dwHkwk"; // Replace with your actual API key
const genAI = new GoogleGenerativeAI(API_KEY);

async function saveDataToFile() {
    try {
        await fs.writeFile('./data.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error saving data to file:", error);
    }
}

async function processApplication(applicantName, amountNeeded, reason) {
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const validationPrompt = `
    Review this funding application for a Muslim charity. Output JSON: {isValid: boolean, reasoning: string}.
    Application: Name: ${applicantName}, Amount: ${amountNeeded}, Reason: ${reason}
    Rules: Prioritize essential needs (medical, food) over luxury (gaming PC). Reason must be clear and align with charitable principles.
    `;

    try {
        const result = await model.generateContent(validationPrompt);
        const validationResult = JSON.parse(result.response.text());

        if (validationResult.isValid) {
            const newApplication = {
                name: applicantName,
                amount: amountNeeded,
                reason: reason,
                status: "pending"
            };
            data.requests_database.push(newApplication);
            await saveDataToFile();
            console.log(`✅ Added application for ${applicantName}. Reason: ${validationResult.reasoning}`);
            return newApplication;
        } else {
            console.log(`❌ Rejected application for ${applicantName}. Reason: ${validationResult.reasoning}`);
            return null;
        }
    } catch (error) {
        console.error(`Error processing application for ${applicantName}:`, error);
        return null;
    }
}

async function donateFundsToRequests(funderName, fundAmount, fundType) {
    if (fundAmount <= 0) return null;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const pendingRequests = data.requests_database.filter(req => req.status === 'pending' && req.amount > 0);

    const prompt = `
      Allocate an incoming fund to the most deserving pending funding requests. Output JSON: {fundAllocations: [{recipientName: string, amountReceived: number}], totalAllocatedFromFund: number, remainingFundAmount: number, message: string}.
      Incoming Fund: Funder: ${funderName}, Amount: ${fundAmount}, Type: ${fundType}
      Pending Requests: ${JSON.stringify(pendingRequests, null, 2)}
      Rules: Prioritize critical needs. Use donation funds generally; loan funds for loans if possible. Fulfill requests optimally. Only fund pending requests with amount > 0. Deduct from request's 'amount', set status to 'funded' if amount <= 0.
      `;

    try {
        const result = await model.generateContent(prompt);
        const allocationResult = JSON.parse(result.response.text());

        let currentFundRemaining = fundAmount;

        for (const fundAllocation of allocationResult.fundAllocations) {
            const requestToUpdate = data.requests_database.find(
                req => req.name === fundAllocation.recipientName && req.status === 'pending' && req.amount > 0
            );

            if (requestToUpdate) {
                const needed = requestToUpdate.amount;
                const amountToApply = Math.min(fundAllocation.amountReceived, needed, currentFundRemaining);

                if (amountToApply > 0) {
                    requestToUpdate.amount -= amountToApply;
                    currentFundRemaining -= amountToApply;

                    if (requestToUpdate.amount <= 0) {
                        requestToUpdate.status = "funded";
                        requestToUpdate.amount = 0; // Ensure it's not negative
                        console.log(`✅ ${requestToUpdate.name} fully funded.`);
                    } else {
                        console.log(`Partial funding for ${requestToUpdate.name}: $${amountToApply}. $${requestToUpdate.amount} still needed.`);
                    }
                }
            }
        }

        allocationResult.remainingFundAmount = currentFundRemaining;
        allocationResult.totalAllocatedFromFund = fundAmount - currentFundRemaining;

        await saveDataToFile();
        console.log(`\nFunds from ${funderName} allocated. Message: ${allocationResult.message}`);
        return allocationResult;
    } catch (error) {
        console.error(`Error allocating fund from ${funderName}:`, error);
        return null;
    }
}

// --- Main Application Flow ---
async function runApp() {
    console.log("--- Starting Donation and Application Demonstration ---");
    console.log("Initial requests_database:", JSON.stringify(data.requests_database, null, 2));

    // Example 1: Add a new application
    // console.log("\n--- Adding a new application ---");
    // await processApplication("Kareem", 5000, "To cover urgent medical expenses for my child.");

    // Example 2: Simulate a donation to fund existing requests
    console.log("\n--- Simulating a Donation from 'FunderX' ($3000) ---");
    await donateFundsToRequests("FunderX", 3000, "donation");

    console.log("\n--- End of Demonstration ---");
    console.log("Final requests_database:", JSON.stringify(data.requests_database, null, 2));
}

runApp();