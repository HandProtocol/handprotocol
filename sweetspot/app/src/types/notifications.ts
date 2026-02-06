export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
  read: boolean
}

// Dummy notifications data
export const DUMMY_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'New Round Started',
    message: 'A new distribution round has begun. Check your allowance!',
    type: 'info',
    timestamp: Date.now() - 3600000, // 1 hour ago
    read: false
  },
  {
    id: '2',
    title: 'Tokens Claimed',
    message: 'Successfully claimed 100 COOKIE tokens',
    type: 'success',
    timestamp: Date.now() - 86400000, // 1 day ago
    read: true
  },
  {
    id: '3',
    title: 'Deposit Successful',
    message: 'Successfully deposited 0.1 ETH',
    type: 'success',
    timestamp: Date.now() - 172800000, // 2 days ago
    read: true
  }
]
