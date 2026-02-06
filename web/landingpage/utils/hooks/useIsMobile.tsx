import { useMediaQuery } from 'react-responsive'

const useIsMobile = () => {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' })
  return isMobile
}

export default useIsMobile
