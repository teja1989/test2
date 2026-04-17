import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DocPage from './pages/DocPage';
import SearchPage from './pages/SearchPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/docs/:repo/*" element={<DocPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </Layout>
  );
}
