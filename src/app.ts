import {Sequelize} from 'sequelize';
import config from './config/config';
import cors from 'cors';
import RhymeRoutes from './routes/rhymesRoute';
import SyllableRoutes from './routes/syllablesRoute';
import WordRoutes from './routes/wordRoute';
import WordSyllablesRoutes from './routes/wordSyllablesRoute';
import RhymingRoutes from './routes/rhymingRoute';
import StatisticsRoutes from './routes/statisticsRoute';
import VisitorLogRoutes from './routes/visitorLogRoute';
import AnnouncementRoutes from './routes/announcementRoute';
import UserRoutes from './routes/userRoute';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
const app = express();
const host = '0.0.0.0';
const port = 8764;


app.use(express.json());

app.use(cors());

app.use('/api/rhymes', RhymeRoutes);
app.use('/api/syllables', SyllableRoutes);
app.use('/api/words', WordRoutes);
app.use('/api/rhyming', RhymingRoutes);
app.use('/api/wordSyllables', WordSyllablesRoutes);
app.use('/api/statistics', StatisticsRoutes);
app.use('/api/visitorLog', VisitorLogRoutes);
app.use('/api/announcement', AnnouncementRoutes);
app.use('/api/user', UserRoutes);

app.get('/', (req, res) => {
  res.send('The server is working!');
});

const universalErrorHandler : ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('有錯誤發生:', err.message,  err.stack); // 佇伺服器端印出錯誤堆疊
  res.status(500).json({ message: '伺服器發生錯誤，請稍後再試。' }); // 回傳統一的錯誤訊息
}

app.use(universalErrorHandler);

module.exports = app;

if(require.main === module){
  app.listen(port, host, () => {
    if (port === 8764) {
      console.log('true')
    }
    console.log(`server is listening on ${host}:${port} !!!`);
  });
}