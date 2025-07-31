const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://h74205311:yjILeVdgifjFhjvm@mydatabases.r29yeuu.mongodb.net/lgcms?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function resetStaffPasswords() {
  try {
    const newPassword = 'StaffPassword123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await mongoose.model('User').updateMany(
      { role: 'staff' },
      { $set: { password: hashedPassword } }
    );
    console.log('Password reset result:', result);
    console.log(`Successfully reset passwords for ${result.modifiedCount} staff members`);
  } catch (err) {
    console.error('Error resetting staff passwords:', err);
  } finally {
    mongoose.disconnect();
  }
}

resetStaffPasswords().catch(err => {
  console.error('Error in resetStaffPasswords:', err);
  mongoose.disconnect();
});