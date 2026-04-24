import React from 'react'
import ReactMarkdown from 'react-markdown'

export default function AIResultDisplay({ result, loading, error }) {
  if (loading) return (
    <div className="ai-result" style={{textAlign:'center',padding:'40px'}}>
      <div className="spinner" style={{margin:'0 auto 16px'}}></div>
      <div style={{fontSize:'16px',fontWeight:600,color:'#4f46e5'}}>AI is analyzing...</div>
      <div style={{fontSize:'14px',color:'#64748b',marginTop:'4px'}}>This may take a few seconds</div>
    </div>
  )

  if (error) return <div className="error-msg">{error}</div>

  if (!result) return null

  return (
    <div className="ai-result">
      <div className="ai-result-header">
        <span className="ai-badge">AI Analysis</span>
        {result.model && <span className="model-info">Model: {result.model}</span>}
        {result.usage && <span className="model-info">Tokens: {result.usage.total_tokens}</span>}
      </div>
      <div className="ai-result-content">
        <ReactMarkdown>{result.analysis}</ReactMarkdown>
      </div>
    </div>
  )
}
