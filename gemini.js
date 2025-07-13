import { GoogleGenerativeAI } from "@google/generative-ai";

let funding_database = [
    {
        "name": "Abid",
        "amount": 1000,
        "type": "donation"
    },
    {
        "name": "Yunus",
        "amount": 5000,
        "type": "loan"
    },
    {
        "name": "Ahmad",
        "amount": 10000,
        "type": "donation"
    },
]

let requests_database = [
    {
        "name": "Haroon",
        "amount": 1000,
        "reason": "I want to build a PC"
    },
    {
        "name": "Tyrone",
        "amount": 12000,
        "type": "I have open heart surgery"
    },
    {
        "name": "Deez",
        "amount": 3000,
        "type": "to buy a car my family needs"
    },
]

const API_KEY = "AIzaSyBZSUtjX1HLWfc8xnzpx6pdCD9H1dwHkwk"; // Replace with your actual API key
const genAI = new GoogleGenerativeAI(API_KEY);

async function generateAllocationPlan() {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Still recommend 1.5-flash for context
      generationConfig: {
        responseMimeType: "application/json", // Crucial for JSON output
        responseSchema: { // Define your expected JSON schema here
          type: "object",
          properties: {
            totalFundsAvailable: {
              type: "number",
              description: "Total funds available from all funders."
            },
            totalFundsRequested: {
              type: "number",
              description: "Total funds requested by all individuals."
            },
            allocations: {
              type: "array",
              description: "List of individual allocations.",
              items: {
                type: "object",
                properties: {
                  recipientName: {
                    type: "string",
                    description: "Name of the person receiving funds."
                  },
                  amountReceived: {
                    type: "number",
                    description: "Amount of money allocated to this recipient."
                  },
                  fundingType: {
                    type: "string",
                    enum: ["donation", "loan"],
                    description: "Type of funding (donation or loan)."
                  },
                  reasonForFunding: {
                    type: "string",
                    description: "The original reason for the funding request."
                  },
                  fundedBy: {
                    type: "array",
                    description: "List of funders contributing to this allocation.",
                    items: {
                      type: "object",
                      properties: {
                        funderName: {
                          type: "string",
                          description: "Name of the funder."
                        },
                        amountContributed: {
                          type: "number",
                          description: "Amount contributed by this specific funder for this allocation."
                        }
                      },
                      required: ["funderName", "amountContributed"]
                    }
                  }
                },
                required: ["recipientName", "amountReceived", "fundingType", "reasonForFunding", "fundedBy"]
              }
            },
            unallocatedFunds: {
              type: "number",
              description: "Any funds that could not be allocated."
            },
            explanation: {
              type: "string",
              description: "A natural language explanation of the allocation decisions."
            }
          },
          required: ["totalFundsAvailable", "totalFundsRequested", "allocations", "unallocatedFunds", "explanation"]
        }
      }
    });
  
    const prompt = `
      You are an AI assistant designed to facilitate funding distribution for a Muslim community.
      Your goal is to allocate funds from donors and lenders to individuals with funding requests, based on the provided data.
  
      Here is the available funding:
      ${JSON.stringify(funding_database, null, 2)}
  
      Here are the funding requests:
      ${JSON.stringify(requests_database, null, 2)}
  
      **Rules for Allocation:**
      1.  **Donations:** Funds marked as "donation" can be freely distributed to any request.
      2.  **Loans:** Funds marked as "loan" should ideally be allocated as loans, with an expectation of repayment. Assume loans are given with the expectation of full repayment by the recipient.
      3.  **Prioritization:** Prioritize critical needs (e.g., medical emergencies, essential family needs) over discretionary spending (e.g., building a PC).
      4.  **Fairness:** Aim to distribute funds equitably while addressing urgent needs.
      5.  **Be Comprehensive:** Ensure all funds are considered for allocation and all requests are addressed as much as possible.
  
      Provide the allocation plan in JSON format according to the specified schema.
      `;
  
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text(); // Get the response text, which should be JSON
      console.log("Raw JSON response from Gemini:", jsonText);
  
      // Parse the JSON string into a JavaScript object
      const allocationPlan = JSON.parse(jsonText);
      console.log("\nParsed Allocation Plan (JavaScript Object):", allocationPlan);
  
      // Now you can access the data as a regular JavaScript object
      console.log("\nTotal Funds Available:", allocationPlan.totalFundsAvailable);
      console.log("Allocations:", allocationPlan.allocations);
      console.log("First allocation recipient:", allocationPlan.allocations[0].recipientName);
  
      // Example: Exporting to a file (Node.js environment)
      // You'd typically do this in a Node.js backend
      const fs = require('fs');
      fs.writeFileSync('allocation_plan.json', JSON.stringify(allocationPlan, null, 2));
      console.log("\nAllocation plan saved to allocation_plan.json");
  
      return allocationPlan; // Return the parsed object for further use in your project
  
    } catch (error) {
      console.error("Error generating content or parsing response:", error);
      // Log the raw response if parsing fails to debug
      if (error instanceof SyntaxError) {
        console.error("Failed to parse JSON. Raw response text might not be valid JSON.");
        console.error("Raw text:", jsonText); // Make sure jsonText is accessible here
      }
    }
  }
  
  generateAllocationPlan();