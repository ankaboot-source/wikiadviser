import { api } from 'src/boot/axios';

export default async function getSentimentAnalysis(articleId: string) {
  const response = await api.get(
    'http://localhost:3000/api/article/sentiment_analysis',
    {
      params: {
        articleId: articleId,
      },
    }
  );
  return response.data.scores;
}
