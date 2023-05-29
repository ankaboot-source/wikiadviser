import { api } from 'src/boot/axios';

export default async function getSentimentAnalysis(text: string) {
  const response = await api.get(
    'http://localhost:3000/api/sentiment_analysis',
    {
      params: {
        text: text,
      },
    }
  );
  return response.data.scores;
}
