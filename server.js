const app = require('./app');
const env = require('./config/env');

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Fina POS Backend API iniciado en el puerto ${PORT}`);
  console.log(`🇻🇪 Enrutado para Venezuela & cPanel Passenger Server`);
  console.log(`=================================================`);
});
