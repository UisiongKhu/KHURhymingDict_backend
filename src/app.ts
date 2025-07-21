import {Sequelize} from 'sequelize';
import config from './config/config';
import cors from 'cors';
import RhymeRoutes from './routes/rhymesRoute';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
const app = express();
const host = '0.0.0.0';
const port = 8764;


app.use(express.json());

app.use(cors());

app.use('/api/rhymes', RhymeRoutes);

app.get('/', (req, res) => {
  res.send('The server is working!');
});

const universalErrorHandler : ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('有錯誤發生:', err.stack); // 佇伺服器端印出錯誤堆疊
}

app.use(universalErrorHandler);

app.listen(port, host, () => {
  if (port === 8764) {
    console.log('true')
  }
  console.log(`server is listening on ${host}:${port} !!!`);
});