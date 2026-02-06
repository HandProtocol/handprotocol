import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Candy, ChevronRight, Pencil, Check, X } from 'lucide-react'
import { SUPPORTED_TOKENS } from '../../types/tokens'
import toast from 'react-hot-toast'
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract
} from 'wagmi'
import {
  SweetSpotContractABI,
  SweetSpotContractAddress
} from '../../contracts/sweetspot/SweetSpotContractInfo'
import { Address, erc20Abi, formatUnits } from 'viem'
import { viemPublicClient } from '../../utils/viemClient'
import { valueInWei } from '../../utils/helpers'
import { clsx } from 'clsx'
import { useApolloClient } from '@apollo/client'

interface DepositFormData {
  token: string
  amount: string
  isCustom: boolean
  message?: string
}

export function Deposit({ onClose }: { onClose?: () => void }) {
  const { address } = useAccount()

  const { data: ethBalance } = useBalance({
    address: address
  })

  const { data: txHash, writeContractAsync } = useWriteContract()
  const client = useApolloClient()

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [formData, setFormData] = useState<DepositFormData>({
    token: SUPPORTED_TOKENS[0].symbol,
    amount: '0',
    isCustom: false
  })

  const selectedToken =
    SUPPORTED_TOKENS.find((token) => token.symbol === formData.token) ||
    SUPPORTED_TOKENS[0]

  const { data: allowanceData, isFetching } = useReadContract({
    abi: erc20Abi,
    address:
      selectedToken.symbol === SUPPORTED_TOKENS[0].symbol
        ? undefined
        : selectedToken.address,
    functionName: 'allowance'
  })

  const { data: balanceData } = useReadContract({
    abi: erc20Abi,
    address: selectedToken?.address ?? undefined,
    args: [address!],
    functionName: 'balanceOf'
  })

  const allowance = parseFloat(allowanceData?.toString() || '0')
  const finalValue =
    parseFloat(formData.amount) * 10 ** (selectedToken?.decimals || 0)
  const hasAllowance = allowance >= finalValue
  const amountBigInt = valueInWei(formData.amount, selectedToken.decimals)

  const balance = balanceData
    ? parseFloat(
        formatUnits(balanceData as bigint, selectedToken?.decimals)
      ).toFixed(3)
    : 0

  const hasSufficientBalance =
    selectedToken.symbol === SUPPORTED_TOKENS[0].symbol
      ? ethBalance?.value && ethBalance?.value >= amountBigInt
      : parseFloat(balance || '0') >= parseFloat(formData.amount)

  const calculateTotal = () => {
    const amount = parseFloat(formData.amount) || 0
    return formData.isCustom ? amount * 1.3333 : amount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showConfirmation) {
      setShowConfirmation(true)
      return
    }

    if (!hasSufficientBalance) {
      toast.error(`Insufficient ${selectedToken.symbol} balance`)
      return
    }

    try {
      // check allowance if not eth, and approve if needed
      if (
        selectedToken.symbol !== SUPPORTED_TOKENS[0].symbol &&
        !hasAllowance
      ) {
        const approveTx = await toast.promise(
          writeContractAsync({
            abi: erc20Abi,
            address: selectedToken.address!,
            functionName: 'approve',
            args: [SweetSpotContractAddress as Address, amountBigInt]
          }),
          {
            error: 'Failed to sign approve token',
            loading: 'Approving token...',
            success: 'Transaction sent!'
          }
        )

        await toast.promise(
          viemPublicClient.waitForTransactionReceipt({
            hash: approveTx,
            confirmations: 3
          }),
          {
            loading: 'waiting for confirmation... ',
            error: '',
            success: 'Token approved!'
          }
        )
      }

      const tx = await toast.promise(
        writeContractAsync({
          abi: SweetSpotContractABI,
          address: SweetSpotContractAddress as Address,
          functionName: 'deposit',
          args: [selectedToken.address, amountBigInt],
          value:
            selectedToken.symbol === SUPPORTED_TOKENS[0].symbol
              ? amountBigInt
              : undefined
        }),
        {
          error: '',
          loading: 'Processing deposit...',
          success: 'Deposit successful!'
        }
      )

      await viemPublicClient.waitForTransactionReceipt({
        hash: tx,
        confirmations: 3
      })

      await client.refetchQueries({
        include: ['TokenBalances']
      })
      onClose?.()
    } catch (error) {
      console.log('error', error)
      // @ts-ignore
      toast.error('Failed to process deposit', String(error))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-8"
    >
      <div className="flex items-center space-x-4 mb-8">
        <Candy className="h-8 w-8 text-purple-600" />
        <h1 className="text-2xl font-bold">Contribute</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {showConfirmation ? (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Deposit Summary</h3>
                  <button
                    type="button"
                    onClick={() => setShowConfirmation(false)}
                    className="text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="text-sm">Edit</span>
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Token:</span>
                    <span className="font-medium">{formData.token}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Base Amount:</span>
                    <span className="font-medium">
                      {formData.amount} {formData.token}
                    </span>
                  </div>
                  {formData.isCustom && (
                    <div className="flex justify-between text-sm text-purple-600">
                      <span>Custom Sweet Fee (33.33%):</span>
                      <span>
                        +{(parseFloat(formData.amount) * 0.3333).toFixed(6)}{' '}
                        {formData.token}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium pt-2 border-t border-purple-200">
                    <span>Total:</span>
                    <span>
                      {calculateTotal().toFixed(6)} {formData.token}
                    </span>
                  </div>
                </div>
                {formData.isCustom && formData.message && (
                  <div className="mt-4 p-4 bg-white rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Custom Message</h4>
                    <p className="text-sm text-gray-600">{formData.message}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <X className="h-5 w-5" />
                  <span>Cancel</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Check className="h-5 w-5" />
                  <span>Confirm Deposit</span>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Token
                </label>
                <select
                  value={formData.token}
                  onChange={(e) =>
                    setFormData({ ...formData, token: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  {SUPPORTED_TOKENS.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol} - {token.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder={`Enter amount in ${formData.token}`}
                  step="0.000001"
                  min="0"
                  required
                />
              </div>
              <div>
                <div className="font-medium text-black">{`Balance : ${selectedToken?.symbol === SUPPORTED_TOKENS[0]?.symbol && ethBalance ? formatUnits(ethBalance?.value, ethBalance?.decimals) : balance} ${selectedToken?.symbol}`}</div>
              </div>

              {/* <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isCustom}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isCustom: e.target.checked
                      })
                    }
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    Make this a Custom Sweet (+33.33%)
                  </span>
                </label>
              </div> */}

              {formData.isCustom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent h-32"
                    placeholder="Add a personal message..."
                    required
                  />
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isFetching}
                className={clsx(
                  `w-full  text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2`,
                  isFetching
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600  hover:bg-purple-700'
                )}
              >
                <span>Review Deposit</span>
                <ChevronRight className="h-5 w-5" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}
