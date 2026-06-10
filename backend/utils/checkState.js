// backend/utils/checkState.js
const mongoose = require('mongoose');
const Fixture = require('../models/Fixture');
require('dotenv').config();

const check = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const summary = await Fixture.aggregate([
    {
      $group: {
        _id: '$stage',
        total:     { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        pending:   { $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  console.log('\nFixture state:');
  summary.forEach((s) => {
    console.log(`  ${s._id}: ${s.completed}/${s.total} complete, ${s.pending} pending`);
  });

  await mongoose.disconnect();
};

check();