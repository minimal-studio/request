const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser')

const app = express();

const mainServerPort = '5777';

app.use(helmet());
app.use(compression());
app.use(cors());

app.get('/test', (req, res) => {
  res.json({
    method: 'get'
  });
});

app.post('/test', (req, res) => {
  res.json({
    method: 'post',
    data: {},
  });
});

app.delete('/test', (req, res) => {
  res.json({
    method: 'delete',
    data: {},
  });
});

app.put('/test', (req, res) => {
  res.json({
    method: 'put',
    data: {},
  });
});

app.post('/encrypt', bodyParser.text({ type: 'text/html' }), (req, res) => {
  res.send(req.body);
});

app.post('/compress', bodyParser.json(), (req, res) => {
  console.log(req.body);
  // res.json(req.body);
  res.json({});
});

// 最后处理所有错误
app.use((req, res, next) => {
  res.status(404).send('non');
});

app.listen(mainServerPort, (err) => {
  if (err) return console.log(err);
  console.log(`main server started at port ${mainServerPort}`);
});
