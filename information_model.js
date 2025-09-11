
// const mongoose = require('mongoose');
// const AutoIncrementFactory = require('mongoose-sequence')(mongoose); // Initialize directly


// const JackpotSchema = new mongoose.Schema({
//   jackpotId: { type: String, required: true },
//   jackpotName: { type: String },
//   value: { type: Number, required: true },
// });

// const InformationBroadcastSchema = new mongoose.Schema({
//   logId: { type: Number, unique: true }, // Auto-incremented ID
//   jackpots: [JackpotSchema], // Array of jackpot updates
//   timestamp: { type: Date, default: Date.now },
// }, { timestamps: true });
// // Get the initialized AutoIncrement plugin

// // Apply plugin directly
// InformationBroadcastSchema.plugin(AutoIncrementFactory, { inc_field: 'logId' });

// const InfoModel = mongoose.model('InformationBroadcast', InformationBroadcastSchema);
// module.exports = InfoModel;
