export interface Category {
  id: string;
  name: string;
  color: string;
}

// Categories for the wheel segments
export const wheelCategories: Category[] = [
  {
    id: '1',
    name: 'Environmental',
    color: '#4CAF50'
  },
  {
    id: '2',
    name: 'Education',
    color: '#2196F3'
  },
  {
    id: '3',
    name: 'Healthcare',
    color: '#E91E63'
  },
  {
    id: '4',
    name: 'Technology',
    color: '#9C27B0'
  },
  {
    id: '5',
    name: 'Community',
    color: '#FF9800'
  },
  {
    id: '6',
    name: 'Arts & Culture',
    color: '#795548'
  },
  {
    id: '7',
    name: 'Research',
    color: '#607D8B'
  },
  {
    id: '8',
    name: 'Humanitarian',
    color: '#F44336'
  }
];