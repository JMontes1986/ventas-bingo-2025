import bcrypt from 'bcryptjs';

const users = ['administrador', 'caja1', 'caja2', 'entrada', 'Ventas1', 'datos'];

users.forEach(user => {
  const envVar = `PASSWORD_${user.toUpperCase()}`;
  const plain = process.env[envVar];
  if (!plain) {
    console.warn(`No password provided for ${user} (${envVar})`);
    return;
  }
  const hash = bcrypt.hashSync(plain, 10);
  console.log(`${user}: ${hash}`);
});
