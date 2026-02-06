import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Users, ExternalLink, Info } from 'lucide-react'
import { formatDate, formatEther } from '../../utils/formatters'
import {
  OrderDirection,
  Round,
  Round_OrderBy,
  useCurrentRoundsQuery,
  useRoundsQuery
} from '../../graphql/generated'
import Markup from '../common/Lexical/Markup'
import getIPFSLink from '../../utils/getIPFSLink'
import Link from 'next/link'
import { timeAgo, timeToGo } from '../../utils/helpers'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Grid,
  Divider,
  Avatar,
  Tooltip,
  Stack
} from '@mui/material'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
}

export function RoundCard({ round }: { round: Round }) {
  const timeLeft = Math.max(0, Number(round.end) * 1000 - Date.now())
  const totalTime = Number(round.end) * 1000 - Number(round.start) * 1000
  const progress = 100 - (timeLeft / totalTime) * 100
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24))

  const isActive =
    Number(round.start) * 1000 < Date.now() &&
    Number(round.end) * 1000 > Date.now()

  const isFuture = Number(round.start) * 1000 > Date.now()
  const isPast = Number(round.end) * 1000 < Date.now()

  const statusColors = {
    active: { bg: '#e0f7fa', text: '#00838f', border: '#00acc1' },
    future: { bg: '#e8f5e9', text: '#2e7d32', border: '#43a047' },
    past: { bg: '#f5f5f5', text: '#757575', border: '#9e9e9e' }
  }

  const statusStyle = isActive
    ? statusColors.active
    : isFuture
      ? statusColors.future
      : statusColors.past

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        sx={{
          borderRadius: '16px',
          boxShadow:
            '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          overflow: 'visible',
          borderLeft: `4px solid ${statusStyle.border}`
        }}
      >
        {isActive && (
          <Box
            sx={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              zIndex: 10
            }}
          >
            <Chip
              label="ACTIVE NOW"
              sx={{
                backgroundColor: '#6200ea',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
          </Box>
        )}

        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  mb: 2
                }}
              >
                {round?.metadata?.image && round?.metadata?.image !== 'null' ? (
                  <Avatar
                    src={getIPFSLink(round?.metadata?.image)}
                    alt={round?.metadata?.name}
                    sx={{ width: 56, height: 56, borderRadius: '12px' }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '12px',
                      bgcolor: statusStyle.bg,
                      color: statusStyle.text
                    }}
                  >
                    <Info />
                  </Avatar>
                )}

                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="h5"
                    component="h3"
                    sx={{ fontWeight: 'bold', mb: 0.5 }}
                  >
                    {round?.metadata?.name || 'Unnamed Round'}
                  </Typography>

                  {round?.metadata?.external_url && (
                    <Link href={round?.metadata?.external_url} passHref>
                      <Typography
                        component="a"
                        variant="body2"
                        sx={{
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 1
                        }}
                      >
                        <ExternalLink size={14} />
                        {round?.metadata?.external_url}
                      </Typography>
                    </Link>
                  )}

                  <Box sx={{ mt: 1 }}>
                    <Chip
                      size="small"
                      label={
                        isActive
                          ? 'Active Round'
                          : isFuture
                            ? 'Upcoming Round'
                            : 'Completed Round'
                      }
                      sx={{
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        fontWeight: 'medium',
                        mr: 1
                      }}
                    />

                    <Chip
                      size="small"
                      label={
                        isActive
                          ? `${daysLeft} days left`
                          : isFuture
                            ? `Starts in ${timeToGo(Number(round.start) * 1000)}`
                            : `Ended ${timeAgo(Number(round.end) * 1000)}`
                      }
                      sx={{
                        backgroundColor: '#f3f4f6',
                        color: '#4b5563'
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 2, mb: 3 }}>
                <Box
                  sx={{
                    px: 1,
                    '& h1': {
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      mt: 2,
                      mb: 1,
                      color: '#111827'
                    },
                    '& h2': {
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      mt: 1.5,
                      mb: 1,
                      color: '#1f2937'
                    },
                    '& h3': {
                      fontSize: '1.125rem',
                      fontWeight: 'bold',
                      mt: 1.5,
                      mb: 0.75,
                      color: '#374151'
                    },
                    '& a': {
                      color: '#3b82f6',
                      textDecoration: 'underline',
                      '&:hover': {
                        textDecoration: 'none'
                      }
                    },
                    '& p': {
                      my: 1
                    },
                    '& code': {
                      bgcolor: '#f3f4f6',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }
                  }}
                  className="round-description"
                >
                  <Markup className="text-gray-600">
                    {round?.metadata?.description}
                  </Markup>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {isActive && (
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {progress.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e0e7ff',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#6366f1',
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />
              </Grid>
            )}

            <Grid item xs={12}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                divider={<Divider orientation="vertical" flexItem />}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calendar size={18} color="#6366f1" />
                  <Tooltip
                    title={new Date(
                      Number(round.createdAt) * 1000
                    ).toLocaleString()}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Created: {timeAgo(Number(round.createdAt) * 1000)}
                    </Typography>
                  </Tooltip>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calendar size={18} color="#6366f1" />
                  <Tooltip
                    title={new Date(
                      Number(round.start) * 1000
                    ).toLocaleString()}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Start: {formatDate(round?.start)}
                    </Typography>
                  </Tooltip>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calendar size={18} color="#6366f1" />
                  <Tooltip
                    title={new Date(Number(round.end) * 1000).toLocaleString()}
                  >
                    <Typography variant="body2" color="text.secondary">
                      End: {formatDate(round?.end)}
                    </Typography>
                  </Tooltip>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function RoundsTab() {
  const { data: currentRoundsData } = useCurrentRoundsQuery()
  const { data: roundsData } = useRoundsQuery({
    variables: {
      orderBy: Round_OrderBy.CreatedAt,
      orderDirection: OrderDirection.Desc
    }
  })
  const currentRound = currentRoundsData?.currentRounds?.[0]?.round

  const completedRounds = roundsData?.rounds.filter(
    (round) => round.id !== currentRound?.id
  )

  return (
    <Box sx={{ py: 3 }}>
      <AnimatePresence>
        {currentRound && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 'bold',
                  mb: 3,
                  display: 'inline-block'
                }}
              >
                {Number(currentRound.start) * 1000 > Date.now()
                  ? '🚀 Starting Soon'
                  : Number(currentRound?.end) * 1000 < Date.now()
                    ? '🏁 Just Ended'
                    : '🔥 Active Round'}
              </Typography>
              <RoundCard round={currentRound} />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontWeight: 'bold',
            mb: 3,
            display: 'inline-block'
          }}
        >
          📜 Past Rounds
        </Typography>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Stack spacing={3}>
            {completedRounds?.map((round) => (
              <RoundCard key={round.id} round={round} />
            ))}

            {(!completedRounds || completedRounds.length === 0) && (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: '#f9fafb',
                  borderRadius: 2
                }}
              >
                <Typography color="text.secondary">
                  No past rounds available
                </Typography>
              </Box>
            )}
          </Stack>
        </motion.div>
      </Box>
    </Box>
  )
}
