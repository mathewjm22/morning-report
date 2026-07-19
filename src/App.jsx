
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home.jsx';
import CaseWorkspace from './components/CaseWorkspace.jsx';
import CaseAuthor from './components/CaseAuthor.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/author" element={<CaseAuthor />} />
      <Route path="/author/:caseId" element={<CaseAuthor />} />
      <Route path="/case/:caseId" element={<CaseWorkspace />} />
      <Route path="/shared/:shareId" element={<CaseWorkspace shared />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
