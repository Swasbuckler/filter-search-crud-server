import app from './app';

app.listen(process.env.BACKEND_PORT!, () => {
  console.log(`Server is running on port ${process.env.BACKEND_PORT}. Go to http://localhost:${process.env.BACKEND_PORT}/`);
});
