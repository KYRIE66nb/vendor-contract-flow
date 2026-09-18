import { Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import ApplyForm from './pages/ApplyForm'
import ContractDetail from './pages/ContractDetail'
import Dashboard from './pages/Dashboard'
import DemoPage from './pages/DemoPage'

// 用 id 作为 key：切换不同申请/合同时强制重挂载，避免本地表单状态串用
function ApplyFormKeyed() {
  const { id } = useParams()
  return <ApplyForm key={id} />
}

function ContractDetailKeyed() {
  const { id } = useParams()
  return <ContractDetail key={id} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apply/:id" element={<ApplyFormKeyed />} />
        <Route path="/contract/:id" element={<ContractDetailKeyed />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
