import React from 'react'
import FormattedAIReport from './FormattedAIReport'

export default function AIResultDisplay({ result, loading, error }) {
  return (
    <FormattedAIReport
      title="AI analysis"
      response={result?.analysis ?? result}
      model={result?.model}
      tokens={result?.usage}
      loading={loading}
      error={error}
    />
  )
}
