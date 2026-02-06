export interface User {
  id: string
  name: string
  address: string
}

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
  },
  {
    id: '2',
    name: 'Bob Smith',
    address: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac'
  },
  {
    id: '3',
    name: 'Carol Williams',
    address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
  },
  {
    id: '4',
    name: 'David Brown',
    address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0'
  },
  {
    id: '5',
    name: 'Eva Martinez',
    address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30'
  }
]
