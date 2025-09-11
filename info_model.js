
const mongoose = require('mongoose');

// Sub-schema for jackpots
const JPSchema = new mongoose.Schema({
  jackpotId: { type: String, required: true },
  jackpotName: { type: String },
  value: { type: Number, required: true },
});

// Main schema
const InfoSchema = new mongoose.Schema({
  jackpots: [JPSchema],                  // Array of jackpot updates
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });


// Prevent model redefinition errors in dev/reload
module.exports = mongoose.models.InfoBroadcast || mongoose.model('InfoBroadcast', InfoSchema);
