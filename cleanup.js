
const schedule = require('node-schedule');

async function initializeCleanup(mongoose) {
  try {
    const IfModel = require('./info_model');

    // Schedule cleanup job to run every 30 minutes
    schedule.scheduleJob('*/5 * * * *', async () => { //5 min run 1 times
      try {
       // Check MongoDB connection before running cleanup
        if (mongoose.connection.readyState !== 1) {
          console.warn('⚠️ MongoDB not connected. Attempting to reconnect...');
          await require('./mongodb_config').connectDBSUB();
        }
        // Cleanup InformationBroadcast collection to keep only the 10 latest records
        const broadcastCount = await IfModel.countDocuments();
        if (broadcastCount > 10) {
          const excessBroadcasts = broadcastCount - 10;
          const latestBroadcasts = await IfModel.find({ timestamp: { $exists: true } })
            .sort({ timestamp: -1 })
            .limit(10)
            .select('_id');
          const latestBroadcastIds = latestBroadcasts.map(b => b._id);
          await IfModel.deleteMany({ _id: { $nin: latestBroadcastIds } });
          console.log(`🗑 Deleted ${excessBroadcasts} oldest InformationBroadcast records to maintain 10 latest records`);
        } else {
          console.log('✅ No cleanup needed: InformationBroadcast collection has 10 or fewer records');
        }


      } catch (error) {
        console.error('Error during scheduled cleanup:', error);
      }
    });
    console.log('Cleanup job scheduled to run every 5 minutes to maintain 10 latest records for InformationBroadcast and Hits');
  } catch (error) {
    console.error('Failed to initialize cleanup:', error);
    process.exit(1);
  }
}

module.exports = { initializeCleanup };

