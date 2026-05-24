import Badge from './Badge'
import '../styles/components/LoadingBadge.css' 

export default function LoadingBadge() {
  return <Badge className="loading-badge" isLoading={true} />
}
