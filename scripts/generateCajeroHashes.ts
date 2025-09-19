import bcrypt from 'bcryptjs';

const users = ['administrador', 'caja1', 'caja2', 'entrada', 'Ventas1', 'datos'];

users.forEach(user => {
  const normalizedUser = user.toLowerCase();
  if (user !== normalizedUser) {
    console.warn(`Username "${user}" normalized to "${normalizedUser}".`);
  }

  const envVar = `PASSWORD_${user.toUpperCase()}`;
  const plain = process.env[envVar];
  if (!plain) {
    console.warn(`No password provided for ${normalizedUser} (${envVar})`);
    return;
  }
  const hash = bcrypt.hashSync(plain, 10);
  console.log(`${normalizedUser}: ${hash}`);
});
