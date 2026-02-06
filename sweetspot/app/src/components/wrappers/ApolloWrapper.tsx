'use client'
import React from 'react'
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  createHttpLink
} from '@apollo/client'
import { GRAPHQL_ENDPOINT } from '../../utils/config'

const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT
})

const cache = new InMemoryCache()

const ApolloWrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new ApolloClient({
    link: httpLink,
    cache: cache
  })

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

export default ApolloWrapper
