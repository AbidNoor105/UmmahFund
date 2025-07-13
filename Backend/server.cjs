// --- Module Imports ---
const express = require('express');
const bodyParser = require('body-parser'); // To parse incoming JSON data
const cors = require('cors'); // To allow frontend requests from different origins
const { GoogleGenerativeAI } = require('@google/generative-ai'); // AI SDK
const fs = require('fs/promises'); // File System Promises for data.json
let data = require('./data.json'); // Import data.json directly (Node.js will cache this)

// --- API Configuration ---
// IMPORTANT: For production, load your API key from environment variables!
// Example: const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_KEY = "AIzaSyB32aqAk8R0gbuSrmc4IXapIH3Jf_9gDWI"; // REPLACE WITH YOUR ACTUAL GEMINI API KEY
const genAI = new GoogleGenerativeAI(API_KEY);

// --- Express App Setup ---
const app = express();
app.use(bodyParser.json()); // Enable parsing of JSON request bodies
app.use(cors()); // Enable CORS for all routes (important for frontend communication)

// --- Helper Function: Saves the current 'data' object back to data.json ---
async function saveDataToFile() {
    try {
        await fs.writeFile('./data.json', JSON.stringify(data, null, 2));
        console.log("Data saved to data.json successfully.");
    } catch (error) {
        console.error("Error saving data to file:", error);
        // In a real app, you might want to return an error status here
    }
}

// --- AI-Powered Core Functions (Adapted to return results for API) ---

// Function: Validates and potentially adds a new application
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
            await saveDataToFile(); // Save updated data to file
            return { success: true, message: `Application for ${applicantName} valid and added.`, data: newApplication, reasoning: validationResult.reasoning };
        } else {
            return { success: false, message: `Application for ${applicantName} rejected.`, reasoning: validationResult.reasoning };
        }
    } catch (error) {
        console.error(`AI processing error for application ${applicantName}:`, error);
        return { success: false, message: `Internal server error during AI processing.`, error: error.message };
    }
}

// Function: Donates funds to the most deserving requests
async function donateFundsToRequests(funderName, fundAmount, fundType) {
    if (fundAmount <= 0) {
        return { success: false, message: `Fund amount must be positive.` };
    }

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
        let actualAllocations = []; // To store what was actually allocated

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
                    }
                    actualAllocations.push({ recipientName: requestToUpdate.name, amountReceived: amountToApply });
                }
            }
        }

        allocationResult.remainingFundAmount = currentFundRemaining;
        allocationResult.totalAllocatedFromFund = fundAmount - currentFundRemaining;
        // Optionally, replace AI's fundAllocations with actualAllocations if you want code's precise deductions
        allocationResult.fundAllocations = actualAllocations;

        await saveDataToFile(); // Save updated data to file
        return { success: true, message: `Funds from ${funderName} allocated.`, details: allocationResult };
    } catch (error) {
        console.error(`Error allocating fund from ${funderName}:`, error);
        return { success: false, message: `Internal server error during fund allocation.`, error: error.message };
    }
}


// --- API Routes ---

// Route 1: POST /api/applications - To add a new funding application
app.post('/api/applications', async (req, res) => {
    const { name, amount, reason } = req.body;

    if (!name || typeof amount !== 'number' || !reason) {
        return res.status(400).json({ error: 'Missing or invalid data: name, amount (number), and reason are required.' });
    }

    const result = await processApplication(name, amount, reason);

    if (result.success) {
        res.status(201).json(result); // 201 Created
    } else {
        res.status(400).json(result); // 400 Bad Request
    }
});

// Route 2: POST /api/donations - To send funds and trigger allocation
app.post('/api/donations', async (req, res) => {
    const { funderName, fundAmount, fundType } = req.body;

    if (!funderName || typeof fundAmount !== 'number' || !fundType) {
        return res.status(400).json({ error: 'Missing or invalid data: funderName, fundAmount (number), and fundType are required.' });
    }

    const result = await donateFundsToRequests(funderName, fundAmount, fundType);

    if (result.success) {
        res.status(200).json(result); // 200 OK
    } else {
        res.status(400).json(result); // 400 Bad Request
    }
});

// Route 3: GET /api/requests - To view all current requests (for frontend display)
app.get('/api/requests', (req, res) => {
    res.status(200).json(data.requests_database);
});

// Route 4: GET /api/requests/pending - To view only pending requests
app.get('/api/requests/pending', (req, res) => {
    const pending = data.requests_database.filter(req => req.status === 'pending' && req.amount > 0);
    res.status(200).json(pending);
});


// --- Start Server ---
const PORT = process.env.PORT || 3000; // Use environment variable for port or default to 3000
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));