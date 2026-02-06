import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Clock, Calendar, Info, Edit3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWriteContract } from 'wagmi'
import {
  SweetSpotContractABI,
  SweetSpotContractAddress
} from '../../contracts/sweetspot/SweetSpotContractInfo'
import uploadToIPFS from '../../utils/uploadToIPFS'
import { viemPublicClient } from '../../utils/viemClient'
import {
  TextField,
  Box,
  Typography,
  InputAdornment,
  Button,
  Divider,
  CardContent,
  Grid,
  alpha
} from '@mui/material'

interface RoundData {
  name: string
  description: string
  startTime: string
  endTime: string
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300 } }
}

export function SetRoundForm() {
  const [roundData, setRoundData] = useState<RoundData>({
    name: '',
    description: '',
    startTime: '',
    endTime: ''
  })

  const { writeContractAsync } = useWriteContract()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const startTimeInEpoch = new Date(roundData.startTime).getTime() / 1000
      const endTimeInEpoch = new Date(roundData.endTime).getTime() / 1000

      // create a json file
      const json = JSON.stringify({
        name: roundData.name,
        description: roundData.description,
        image: 'null',
        external_url: 'https://handprotocol.org'
      })

      const jsonFile = new File([json], 'round-metadata.json', {
        type: 'application/json'
      })

      const { uri } = await uploadToIPFS(jsonFile)

      console.log('startTimeInEpoch : ', startTimeInEpoch)
      console.log('endTimeInEpoch : ', endTimeInEpoch)
      console.log('uri : ', uri)

      await toast.promise(
        (async () => {
          const tx = await writeContractAsync({
            abi: SweetSpotContractABI,
            address: SweetSpotContractAddress,
            functionName: 'setRound',
            args: [startTimeInEpoch, endTimeInEpoch, uri]
          })

          if (!tx) {
            toast.error('Failed to sign the transaction')
            throw new Error('Failed to set round')
          }

          await viemPublicClient.waitForTransactionReceipt({
            hash: tx,
            confirmations: 3
          })
        })(),
        {
          error: 'Failed to set round',
          loading: 'Setting round...',
          success: 'Current round updated!'
        }
      )
    } catch (error) {
      toast.error('Failed to update round settings.')
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="bg-s-bg rounded-2xl shadow-sm mb-12">
        <CardContent sx={{ p: 4 }}>
          <motion.div variants={itemVariants} className="mb-6">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Typography variant="h4" fontWeight="700" color="#6b21a8">
                <Box
                  component="span"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                >
                  <Settings className="h-7 w-7 text-purple-600" />
                  Round Settings
                </Box>
              </Typography>
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.4 }}
              >
                <Box
                  sx={{
                    backgroundColor: alpha('#9333ea', 0.1),
                    p: 1.5,
                    borderRadius: '50%'
                  }}
                >
                  <Settings className="h-6 w-6 text-purple-600" />
                </Box>
              </motion.div>
            </Box>

            <Divider sx={{ mb: 4, opacity: 0.6 }} />
          </motion.div>

          <form onSubmit={handleSubmit}>
            <Box component={motion.div} variants={itemVariants} mb={4}>
              <TextField
                label="Round Name"
                variant="outlined"
                fullWidth
                value={roundData.name}
                onChange={(e) =>
                  setRoundData({ ...roundData, name: e.target.value })
                }
                placeholder="e.g., Genesis Round, Community Distribution Phase 1"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Edit3 className="h-5 w-5 text-purple-500" />
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#9333ea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#9333ea'
                    }
                  },
                  mb: 3
                }}
              />
            </Box>

            <Box component={motion.div} variants={itemVariants} mb={4}>
              <TextField
                label="Round Description"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={roundData.description}
                onChange={(e) =>
                  setRoundData({ ...roundData, description: e.target.value })
                }
                placeholder="Describe the purpose and goals of this distribution round..."
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Info className="h-5 w-5 text-purple-500" />
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#9333ea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#9333ea'
                    }
                  }
                }}
              />
            </Box>

            <Grid
              container
              spacing={3}
              component={motion.div}
              variants={itemVariants}
            >
              <Grid item xs={12} md={6}>
                <TextField
                  label="Start Time"
                  type="datetime-local"
                  fullWidth
                  value={roundData.startTime}
                  onChange={(e) =>
                    setRoundData({ ...roundData, startTime: e.target.value })
                  }
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calendar className="h-5 w-5 text-purple-500" />
                      </InputAdornment>
                    )
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#9333ea'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#9333ea'
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="End Time"
                  type="datetime-local"
                  fullWidth
                  value={roundData.endTime}
                  onChange={(e) =>
                    setRoundData({ ...roundData, endTime: e.target.value })
                  }
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Clock className="h-5 w-5 text-purple-500" />
                      </InputAdornment>
                    )
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#9333ea'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#9333ea'
                      }
                    }
                  }}
                />
              </Grid>
            </Grid>

            <Box
              component={motion.div}
              variants={itemVariants}
              mt={4}
              display="flex"
              justifyContent="center"
            >
              <motion.div
                whileHover={{
                  scale: 1.03,
                  boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.5)'
                }}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%' }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{
                    py: 1.5,
                    px: 4,
                    mt: 2,
                    borderRadius: '10px',
                    backgroundColor: '#9333ea',
                    '&:hover': {
                      backgroundColor: '#7e22ce'
                    },
                    color: 'white',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    fontSize: '1rem',
                    boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.39)'
                  }}
                >
                  Update Round
                </Button>
              </motion.div>
            </Box>
          </form>
        </CardContent>
      </div>
    </div>
  )
}
