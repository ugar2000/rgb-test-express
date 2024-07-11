const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const mongoose = require('mongoose');
const cors = require('cors');

const usersRouter = require('./routes/users');
const filesRouter = require('./routes/files');
const port = 3000;

const app = express();

mongoose.connect('mongodb+srv://rgbuser:G1vTiOwu1WUHPL8O@cluster0.zmvaioc.mongodb.net/?appName=Cluster0')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(cors())

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hello World',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve)
app.get('/api-docs', swaggerUi.setup(specs));

app.use('/users', usersRouter);
app.use('/files', filesRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err
  });
});

const start = () => {
  try {
    const server = app.listen(port, () => console.log(`Сервер запущен с портом ${port}`));
    return server;
  } catch (e) {
    process.exit(1);
  }
}

const server = start();