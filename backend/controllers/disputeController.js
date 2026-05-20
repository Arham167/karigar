const supabase = require("../utils/supabase");
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function updateProviderScore(providerId, type) {
  try {
    const { data: provider } = await supabase
      .from("providers")
      .select("base_rating, on_time_score, cancellation_rate")
      .eq("id", providerId)
      .single();

    if (!provider) return;

    let updates = {};
    if (type === 'no-show') {
      updates.on_time_score = Math.max(1, (parseFloat(provider.on_time_score) || 5) - 0.5);
      updates.cancellation_rate = Math.min(100, (parseFloat(provider.cancellation_rate) || 0) + 10);
    } else if (type === 'late') {
      updates.on_time_score = Math.max(1, (parseFloat(provider.on_time_score) || 5) - 0.2);
    } else if (type === 'cancellation') {
      updates.cancellation_rate = Math.min(100, (parseFloat(provider.cancellation_rate) || 0) + 5);
      updates.base_rating = Math.max(1, (parseFloat(provider.base_rating) || 5) - 0.1);
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("providers").update(updates).eq("id", providerId);
    }
  } catch (e) {
    console.error("[Dispute Controller] Error updating score:", e);
  }
}

exports.updateProviderScore = updateProviderScore;

exports.fileDispute = async (req, res) => {
  try {
    const { bookingId, filerId, disputeType, description } = req.body;

    if (!bookingId || !disputeType) {
      return res.status(400).json({ success: false, error: "Missing required fields: bookingId, disputeType" });
    }

    console.log(`[Dispute Controller] Filing dispute for booking ${bookingId}, type: ${disputeType}`);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    let resolution = "Pending Review";
    let antigravityEvaluation = "System: Dispute filed.";
    let nextBestProviders = [];
    
    // Check if we can use Gemini for smart evaluation
    const geminiKey = process.env.GEMINI_API_KEY;
    let aiParsedResult = null;

    if (geminiKey && geminiKey !== "your_gemini_key" && geminiKey !== "") {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Fetch recent chat history
        const { data: chatHistory } = await supabase
          .from("chats")
          .select("sender_id, message, timestamp")
          .eq("booking_id", bookingId)
          .order("timestamp", { ascending: true })
          .limit(30);

        let chatText = chatHistory && chatHistory.length > 0 
          ? chatHistory.map(c => `${c.sender_id === filerId ? 'Buyer' : 'Seller'} [${new Date(c.timestamp).toLocaleTimeString()}]: ${c.message}`).join("\n") 
          : "No chat history available.";

        const prompt = `You are an AI arbitrator for a local home services app.
A dispute has been filed by the Buyer.
Dispute Type: "${disputeType}"
Buyer's Claim/Complaint: "${description || "None provided"}"
Database Recorded Price: Rs. ${booking.price}

Chat History Context:
${chatText}

Analyze the dispute. Consider these edge cases:
- Price Extortion: If buyer claims seller asked for more money IRL, check if the chat proves they agreed to extra parts/labor. If not, seller is at fault.
- False No-Show: If buyer claims no-show, check if seller said "I am outside" but buyer didn't reply. If so, buyer is at fault.
- False Late: Check timestamps in chat to see if seller communicated delays proactively.

Return ONLY a valid JSON object with the following structure:
{
  "evaluation": "string (Short 2 sentence explanation of your findings based strictly on the chat evidence)",
  "at_fault": "seller" | "buyer" | "unclear",
  "apply_penalty": "no-show" | "late" | "cancellation" | null (Only apply if seller is clearly at fault for these specific infractions)
}`;

        console.log("[Dispute Controller] Sending dispute to Gemini for intelligent arbitration...");
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        
        const contentText = result.response.text().trim();
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiParsedResult = JSON.parse(jsonMatch[0]);
          antigravityEvaluation = `AI Judge: ${aiParsedResult.evaluation}`;
          console.log("[Dispute Controller] AI Decision:", aiParsedResult);
        }
      } catch (e) {
        console.error("[Dispute Controller] Gemini evaluation failed:", e.message);
      }
    }

    // Apply logic based on AI decision OR fallback to dumb logic
    if (aiParsedResult) {
      if (aiParsedResult.at_fault === "seller" && aiParsedResult.apply_penalty) {
        const providerId = booking.provider_id || booking.seller_id;
        if (providerId) {
          await updateProviderScore(providerId, aiParsedResult.apply_penalty);
        }
        resolution = `Automated penalty applied for ${aiParsedResult.apply_penalty}.`;
        
        // Find alternatives if it's a no-show
        if (aiParsedResult.apply_penalty === "no-show") {
          const { data: alternatives } = await supabase
            .from("providers")
            .select("*, provider_services!inner(service_type)")
            .eq("location", booking.location || "Karachi")
            .neq("id", booking.provider_id || booking.seller_id)
            .order("base_rating", { ascending: false })
            .limit(5);
          nextBestProviders = alternatives || [];
        }
      } else if (aiParsedResult.at_fault === "buyer") {
        resolution = "Dispute rejected. Chat history contradicts buyer's claim.";
      } else {
        resolution = "Requires manual admin review. Evidence unclear.";
      }
    } else {
      // FALLBACK LOGIC if AI is down
      if (disputeType === "no-show") {
        const providerId = booking.provider_id || booking.seller_id;
        if (providerId) await updateProviderScore(providerId, 'no-show');
        resolution = "Provider penalized for no-show (Fallback logic)";
        const { data: alternatives } = await supabase
          .from("providers")
          .select("*, provider_services!inner(service_type)")
          .eq("location", booking.location || "Karachi")
          .neq("id", providerId)
          .order("base_rating", { ascending: false })
          .limit(5);
        nextBestProviders = alternatives || [];
      } else if (disputeType === "late") {
        const providerId = booking.provider_id || booking.seller_id;
        if (providerId) await updateProviderScore(providerId, 'late');
        resolution = "Provider penalized for being late (Fallback logic)";
      } else {
        resolution = "System: Dispute logged. Manual review required.";
      }
    }

    // Insert dispute record
    const { data: disputeData, error: disputeError } = await supabase
      .from("disputes")
      .insert([{
        booking_id: bookingId,
        filer_id: filerId,
        dispute_type: disputeType,
        description: description || "No description provided",
        antigravity_evaluation: antigravityEvaluation,
        resolution: resolution
      }])
      .select();

    if (disputeError) {
      console.error("[Dispute Controller] Error inserting dispute:", disputeError);
      return res.status(500).json({ success: false, error: disputeError.message });
    }

    // Update booking status
    await supabase.from("bookings").update({ status: "disputed" }).eq("id", bookingId);

    console.log(`[Dispute Controller] Successfully filed dispute ${disputeData[0].id}`);

    return res.status(200).json({
      success: true,
      dispute: disputeData[0],
      nextBestProviders: nextBestProviders,
      message: "Dispute filed and evaluated successfully."
    });

  } catch (error) {
    console.error("[Dispute Controller] Exception:", error.message, error.stack);
    return res.status(500).json({ success: false, error: "An internal server error occurred while filing the dispute." });
  }
};

exports.getDisputeStatus = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { data, error } = await supabase.from("disputes").select("*").eq("id", disputeId).single();
    if (error || !data) return res.status(404).json({ success: false, error: "Dispute not found" });
    return res.status(200).json({ success: true, dispute: data });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
