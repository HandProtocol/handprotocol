import React, { useState, useRef, useEffect } from 'react';
import { Heart, Volume2, VolumeX, X, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { projects } from './data/projects';
import type { Project } from './data/projects';
import { wheelCategories } from './data/categories';
import { sendDonationWebhook, sendSpinWebhook } from './utils/discord';
import { SpinningWords } from './components/SpinningWords';
import { DiscoveredProjectsIcon } from './components/DiscoveredProjectsIcon';
import { DiscoveredProjectsModal } from './components/DiscoveredProjectsModal';

import { useDiscoveredProjects } from './contexts/DiscoveredProjectsContext';

// Chain information for USDGLO
const chainInfo = [
  {
    name: 'Ethereum',
    icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=025',
    uniswapLink: 'https://app.uniswap.org/swap?outputCurrency=0x4F604735c1cF31399C6E711D5962b2B3E0225AD3&chain=mainnet',
    explorerLink: 'https://etherscan.io/token/0x4F604735c1cF31399C6E711D5962b2B3E0225AD3'
  },
  {
    name: 'Polygon',
    icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=025',
    uniswapLink: 'https://app.uniswap.org/swap?outputCurrency=0x4F604735c1cF31399C6E711D5962b2B3E0225AD3&chain=polygon',
    explorerLink: 'https://polygonscan.com/token/0x4F604735c1cF31399C6E711D5962b2B3E0225AD3'
  },
  {
    name: 'Celo',
    icon: 'https://cryptologos.cc/logos/celo-celo-logo.svg?v=025',
    uniswapLink: 'https://app.uniswap.org/swap?outputCurrency=0x4F604735c1cF31399C6E711D5962b2B3E0225AD3&chain=celo',
    explorerLink: 'https://celoscan.io/token/0x4f604735c1cf31399c6e711d5962b2b3e0225ad3'
  },
  {
    name: 'Optimism',
    icon: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg?v=025',
    uniswapLink: 'https://app.uniswap.org/swap?outputCurrency=0x4F604735c1cF31399C6E711D5962b2B3E0225AD3&chain=optimism',
    explorerLink: 'https://optimistic.etherscan.io/token/0x4f604735c1cf31399c6e711d5962b2b3e0225ad3'
  },
  {
    name: 'Base',
    icon: 'https://cryptologos.cc/logos/base-logo.svg?v=025',
    uniswapLink: 'https://app.uniswap.org/swap?outputCurrency=0x4F604735c1cF31399C6E711D5962b2B3E0225AD3&chain=base',
    explorerLink: 'https://basescan.org/token/0x4f604735c1cf31399c6e711d5962b2b3e0225ad3'
  },
  {
    name: 'Arbitrum',
    icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg?v=025',
    uniswapLink: 'https://app.uniswap.org/swap?outputCurrency=0x4F604735c1cF31399C6E711D5962b2B3E0225AD3&chain=arbitrum',
    explorerLink: 'https://arbiscan.io/token/0x4f604735c1cf31399c6e711d5962b2b3e0225ad3'
  },
  {
    name: 'Stellar',
    icon: 'https://cryptologos.cc/logos/stellar-xlm-logo.svg?v=025',
    uniswapLink: 'https://www.stellarx.com/swap/USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN/USDGLO:GBBS25EGYQPGEZCGCFBKG4OAGFXU6DSOQBGTHELLJT3HZXZJ34HWS6XV',
    address: 'GBBS25EGYQPGEZCGCFBKG4OAGFXU6DSOQBGTHELLJT3HZXZJ34HWS6XV'
  },
  {
    name: 'Brale',
    icon: 'https://brale.xyz/favicon.ico',
    uniswapLink: 'https://brale.xyz/stablecoins/usdglo',
    isBrale: true
  }
];

function App() {
  const [spinning, setSpinning] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [showUSDGLOInfo, setShowUSDGLOInfo] = useState(false);
  const [showDiscoveredProjects, setShowDiscoveredProjects] = useState(false);
  const [showDailyUnderdogModal, setShowDailyUnderdogModal] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [todaysUnderdog, setTodaysUnderdog] = useState<Project | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const usdgloModalRef = useRef<HTMLDivElement>(null);
  const dailyUnderdogModalRef = useRef<HTMLDivElement>(null);
  const { dispatch } = useDiscoveredProjects();

  // Get the last 30 projects (considered "underdogs" - newer/less established)
  const underdogProjects = projects.slice(-30);

  const getTodaysUnderdog = () => {
    // Use current date as seed for consistent daily selection
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const seed = dateString.split('-').reduce((acc, part) => acc + parseInt(part), 0);
    const index = seed % underdogProjects.length;
    return underdogProjects[index];
  };

  const formatUnderdogCategory = (project: Project) => {
    const description = project.description.toLowerCase();
    if (description.includes('environment') || description.includes('green') || description.includes('climate')) {
      return '🌱 Environmental';
    } else if (description.includes('education') || description.includes('learning') || description.includes('academy')) {
      return '📚 Education';
    } else if (description.includes('art') || description.includes('creative') || description.includes('music')) {
      return '🎨 Creative';
    } else if (description.includes('health') || description.includes('medical') || description.includes('care')) {
      return '💊 Healthcare';
    } else if (description.includes('development') || description.includes('tool') || description.includes('platform')) {
      return '🛠️ Tech/Tools';
    } else if (description.includes('dao') || description.includes('governance') || description.includes('community')) {
      return '🏛️ Governance';
    }
    return '🌐 Web3';
  };

  useEffect(() => {
    const underdog = getTodaysUnderdog();
    setTodaysUnderdog(underdog);
  }, []);

  useEffect(() => {
    // Create stars
    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars';
    document.body.appendChild(starsContainer);

    // Create 50 stars with random properties
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.setProperty('--duration', `${2 + Math.random() * 4}s`);
      star.style.setProperty('--opacity', `${0.3 + Math.random() * 0.7}`);
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.width = star.style.height = `${1 + Math.random() * 2}px`;
      starsContainer.appendChild(star);
    }

    return () => {
      document.body.removeChild(starsContainer);
    };
  }, []);

  useEffect(() => {
    if (selectedProject && showModal) {
      const interval = setInterval(() => {
        const button = document.querySelector('.donate-button');
        button?.classList.add('jiggle');
        setTimeout(() => {
          button?.classList.remove('jiggle');
        }, 500);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [selectedProject, showModal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dailyUnderdogModalRef.current && !dailyUnderdogModalRef.current.contains(event.target as Node)) {
        setShowDailyUnderdogModal(false);
      }
    };

    if (showDailyUnderdogModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDailyUnderdogModal]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowModal(false);
        setShowUSDGLOInfo(false);
        setShowDailyUnderdogModal(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const segmentAngle = 360 / wheelCategories.length;

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 1000,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const handleAddToDraws = async (project: Project) => {
    try {
      await sendDonationWebhook(project);
      
      // Add to discovered projects
      dispatch({
        type: 'ADD_PROJECT',
        payload: {
          id: project.id,
          name: project.name,
          description: project.description,
          link: project.link,
          discoveredAt: Date.now(),
          category: formatUnderdogCategory(project)
        }
      });
      
      setShowModal(false);
      setShowDiscoveredProjects(true);
    } catch (error) {
      console.error('Failed to process add to draws:', error);
      // Still add to discovered projects even if webhook fails
      dispatch({
        type: 'ADD_PROJECT',
        payload: {
          id: project.id,
          name: project.name,
          description: project.description,
          link: project.link,
          discoveredAt: Date.now(),
          category: formatUnderdogCategory(project)
        }
      });
      setShowModal(false);
      setShowDiscoveredProjects(true);
    }
  };



  const getRandomProject = (category: string) => {
    const eligibleProjects = category === "ALL" 
      ? projects 
      : projects.filter(p => p.category === category || p.category === "ALL");

    const projectPool = eligibleProjects.length > 0 ? eligibleProjects : projects;
    
    const randomIndex = Math.floor(Math.random() * projectPool.length);
    return projectPool[randomIndex];
  };

  const spinWheel = async () => {
    if (spinning) return;
    
    await sendSpinWebhook();
    setSpinning(true);
    setSelectedProject(null);
    setShowModal(false);
    setShowWinner(false);
    
    if (audioRef.current && !isMuted) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
    
    const randomSegment = Math.floor(Math.random() * wheelCategories.length);
    const baseSpins = 5;
    const extraSpins = Math.random() * 3;
    const targetRotation = rotation + ((baseSpins + extraSpins) * 360) - (randomSegment * segmentAngle);
    
    setRotation(targetRotation);

    const winningCategory = wheelCategories[randomSegment].name;
    const winningProject = getRandomProject(winningCategory);

    setTimeout(() => {
      setSpinning(false);
      setSelectedProject(winningProject);
      
      // Show the winner announcement first
      setShowWinner(true);
      triggerConfetti();

      // Then show the modal after a delay
      setTimeout(() => {
        setShowModal(true);
      }, 2000);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }, 8000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="fixed top-4 right-4 z-40">
        <DiscoveredProjectsIcon onClick={() => setShowDiscoveredProjects(true)} />
      </div>

      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-2 md:gap-3">
          <Heart className="text-pink-500 w-8 h-8 md:w-12 md:h-12" fill="currentColor" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-400 to-purple-600">
            IMPACT PROJECTS!
          </span>
        </h1>
        <p className="text-lg md:text-2xl text-purple-200 mb-2 px-4 md:px-0">
          Spin the wheel to discover an amazing positive impact project! DISCOVER PROJECTS beyond the well-marketed mainstream - explore hidden gems making real change 
        </p>
        <a
          href="https://giveth.io/qf/all"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-purple-300 hover:text-purple-200 transition-colors inline-block"
        >
          View all projects →
        </a>
      </div>

      <div className="relative w-[300px] h-[300px] md:w-[600px] md:h-[600px] mb-8 md:mb-12">
        <div className="wheel-outer-ring" />
        <div className="wheel-inner-ring" />
        <SpinningWords isSpinning={spinning || !!selectedProject} />
        
        {selectedProject && showWinner && !showModal && (
          <div className="absolute inset-0 flex items-center justify-center z-30 animate-winner-reveal">
            <div className="bg-gradient-to-br from-purple-900/95 to-purple-800/95 p-6 rounded-2xl shadow-2xl border border-purple-500/30 backdrop-blur-sm text-center transform scale-winner">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                Winner!
              </h3>
              <p className="text-lg md:text-xl text-purple-200 font-medium">
                {selectedProject.name}
              </p>
            </div>
          </div>
        )}
        
        <div
          ref={wheelRef}
          onClick={spinWheel}
          className="absolute w-full h-full rounded-full border-4 md:border-8 border-purple-300/30 shadow-2xl overflow-hidden backdrop-blur-[2px] cursor-pointer"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning 
              ? 'transform 8s cubic-bezier(0.32, 0.94, 0.60, 1)'
              : 'none',
            background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))'
          }}
        >
          {wheelCategories.map((category, index) => (
            <div
              key={category.id}
              className="wheel-segment"
              style={{
                transform: `rotate(${index * segmentAngle}deg)`,
              }}
            >
              <div
                className="absolute w-full h-full origin-center"
                style={{
                  clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 50% 100%)',
                  background: `linear-gradient(${index % 2 ? 45 : -45}deg, 
                    ${category.color}66, 
                    ${category.color}99)`
                }}
              />
              <div
                className="absolute left-1/2 text-white font-medium text-xs md:text-sm whitespace-nowrap transform -translate-y-1/2 px-2 md:px-4 py-1 md:py-2 rounded-full bg-purple-700/60 backdrop-blur-sm shadow-lg"
                style={{
                  top: '25%',
                  transform: `translateX(10px) md:translateX(20px) rotate(${90 + segmentAngle/2}deg)`,
                  maxWidth: '120px md:180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {category.name}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 rounded-full border-2 md:border-4 border-purple-400/50 z-20 center-pin" />

        <div className="pointer absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 md:-translate-y-4 w-6 h-12 md:w-8 md:h-16 z-10">
          <div className="w-full h-full bg-gradient-to-b from-yellow-400 to-yellow-500 clip-triangle shadow-lg" />
        </div>

        <button
          onClick={spinWheel}
          disabled={spinning}
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 px-6 md:px-8 py-3 md:py-4 text-lg md:text-xl font-bold rounded-full transition-all grow-button ${
            spinning
              ? 'opacity-0'
              : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 hover:shadow-lg active:scale-95 shadow-md border border-white/10'
          }`}
        >
          {spinning ? 'Growing...' : 'Lets GROW!'}
        </button>
      </div>

      <div className="flex justify-center w-full mb-8 md:mb-12">
        {todaysUnderdog && (
          <div className="text-center">
            <button
              onClick={() => setShowDailyUnderdogModal(true)}
              className="px-6 md:px-8 py-3 md:py-4 text-base md:text-xl font-bold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-shadow shadow-md mx-auto block"
            >
              <div className="flex items-center gap-2 justify-center">
                <span>💎 Daily Underdog</span>
              </div>
            </button>
            <div className="mt-2 text-sm text-purple-200">
              <div className="font-semibold">{todaysUnderdog.name}</div>
              <div className="text-xs opacity-80">{formatUnderdogCategory(todaysUnderdog)} • Project #{todaysUnderdog.id}/117</div>
            </div>
          </div>
        )}
      </div>

      {/* Sound button - fixed to lower right corner */}
      <button
        onClick={toggleMute}
        className="fixed bottom-20 right-4 md:bottom-24 md:right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all shadow-md z-40"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 md:w-6 md:h-6 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
        )}
      </button>

      <DiscoveredProjectsModal isOpen={showDiscoveredProjects} onClose={() => setShowDiscoveredProjects(false)} />

      {/* Daily Underdog Modal */}
      {todaysUnderdog && showDailyUnderdogModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full px-4 py-6 md:py-12 flex items-center justify-center">
            <div 
              ref={dailyUnderdogModalRef}
              className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 md:p-8 rounded-2xl transform animate-fade-in shadow-2xl border border-purple-500/30 glow-effect w-full max-w-md md:max-w-lg relative my-auto"
            >
              <button
                onClick={() => setShowDailyUnderdogModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
                    <span className="text-3xl">💎</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Daily Underdog</h2>
                  <p className="text-purple-200">Today's featured hidden gem!</p>
                </div>

                <div className="bg-purple-800/50 rounded-xl p-6 mb-6 backdrop-blur-sm border border-purple-600/20">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-xs bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full">
                      {formatUnderdogCategory(todaysUnderdog)}
                    </span>
                    <span className="text-xs bg-yellow-500/30 text-yellow-200 px-3 py-1 rounded-full">
                      Project #{todaysUnderdog.id}/117
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl text-white mb-4 font-semibold">{todaysUnderdog.name}</h3>
                  <p className="text-base md:text-lg text-purple-200 leading-relaxed">{todaysUnderdog.description}</p>
                </div>

                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 mb-6 border border-yellow-500/30">
                  <p className="text-yellow-100 text-sm">
                    <strong>🌟 Why it's today's underdog:</strong><br/>
                    This project represents the hidden gems that don't get mainstream attention but are making real impact. Every day we highlight one of these lesser-known projects!
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <a
                    href={todaysUnderdog.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:scale-105 hover:shadow-lg transition-all font-bold text-lg shadow-md text-center block flex items-center justify-center gap-2"
                  >
                    🌟 Visit Project Page
                    <ExternalLink className="w-5 h-5" />
                  </a>

                  <button
                    onClick={() => handleAddToDraws(todaysUnderdog)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full hover:scale-105 hover:shadow-lg transition-all font-bold text-lg shadow-md"
                  >
                    📝 Add to my list of Draws
                  </button>
                  <button
                    onClick={() => setShowDailyUnderdogModal(false)}
                    className="text-purple-300 hover:text-purple-200 transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProject && showModal && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full px-4 py-6 md:py-12 flex items-center justify-center">
            <div 
              ref={modalRef}
              className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 md:p-10 rounded-2xl transform animate-fade-in shadow-2xl border border-purple-500/30 glow-effect w-full max-w-md md:max-w-lg relative my-auto"
            >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="text-center">
              <div className="mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">🎯 You landed on...</h2>
                <p className="text-purple-200">An amazing project to explore!</p>
              </div>

              <div className="bg-purple-800/50 rounded-xl p-6 mb-6 backdrop-blur-sm border border-purple-600/20">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-xs bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full">
                    {formatUnderdogCategory(selectedProject)}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl text-white mb-3 font-semibold">{selectedProject.name}</h3>
                <p className="text-base md:text-lg text-purple-200">{selectedProject.description}</p>
              </div>

              <div className="bg-gradient-to-r from-purple-700/30 to-pink-700/30 rounded-xl p-4 mb-6 border border-purple-500/20">
                <p className="text-purple-100 text-sm">
                  💡 <strong>What would you like to do?</strong><br/>
                  Visit the project page to learn more, or add it to your draws list to keep track of projects you've discovered!
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <a
                  href={selectedProject.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:scale-105 hover:shadow-lg transition-all font-bold text-lg shadow-md text-center block"
                >
                  🌟 Visit Project Page
                </a>
                <button
                  onClick={() => handleAddToDraws(selectedProject)}
                  className="donate-button w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:scale-105 hover:shadow-lg transition-all font-bold text-lg shadow-md"
                >
                  📝 Add to my list of Draws
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-purple-300 hover:text-purple-200 transition-colors text-sm"
                >
                  ⏭️ Skip this draw
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {showUSDGLOInfo && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full px-4 py-6 md:py-12 flex items-center justify-center">
            <div
              ref={usdgloModalRef}
              className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 md:p-8 rounded-2xl transform animate-fade-in shadow-2xl border border-purple-500/30 w-full max-w-sm md:max-w-2xl relative my-auto"
            >
            <button
              onClick={() => setShowUSDGLOInfo(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                About $USDGLO
              </h2>
              <div className="bg-purple-800/50 rounded-xl p-6 backdrop-blur-sm border border-purple-600/20 text-left mb-6">
                <p className="text-lg text-purple-200 mb-4">
                  Glo Dollar lets you fund your favorite organizations. Vote on fighting extreme poverty, strengthening Web3 public goods, or combating climate change, among other causes.
                </p>
                <h3 className="text-xl font-bold text-white mb-3">How it works</h3>
                <ol className="list-decimal list-inside space-y-2 text-purple-200">
                  <li>The fiat backing Glo Dollar is invested and earns revenue.</li>
                  <li>We donate 100% of our profits on these investments to public goods and charities.</li>
                  <li>You're funding public goods at zero cost.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Available on Multiple Chains</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chainInfo.map((chain) => (
                    <div
                      key={chain.name}
                      className="bg-purple-800/30 rounded-xl p-4 backdrop-blur-sm border border-purple-600/20"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={chain.icon}
                          alt={`${chain.name} logo`}
                          className="w-8 h-8"
                        />
                        <h4 className="text-lg font-bold text-white">{chain.name}</h4>
                      </div>
                      {chain.isBrale ? (
                        <a
                          href={chain.uniswapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-purple-600/40 hover:bg-purple-600/60 rounded-lg text-white transition-all"
                        >
                          View on Brale <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : chain.name === 'Stellar' ? (
                        <div>
                          <p className="text-purple-200 text-sm mb-2 break-all">
                            {chain.address}
                          </p>
                          <a
                            href={chain.uniswapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-purple-600/40 hover:bg-purple-600/60 rounded-lg text-white transition-all"
                          >
                            Trade on StellarX <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <a
                            href={chain.uniswapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-purple-600/40 hover:bg-purple-600/60 rounded-lg text-white transition-all"
                          >
                            Trade on Uniswap <ExternalLink className="w-4 h-4" />
                          </a>
                          <a
                            href={chain.explorerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-200 transition-all text-sm"
                          >
                            View Contract <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}



      <audio
        ref={audioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3"
        loop
      />

      <footer className="fixed bottom-4 left-0 right-0 text-center text-purple-200 text-sm">
        <div className="flex justify-center items-center gap-4">
          <a
            href="https://giveth.handprotocol.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-white transition-colors"
          >
            Made with <Heart className="w-4 h-4 text-pink-500" fill="currentColor" /> by Hand Protocol
          </a>
          <span className="text-purple-400">•</span>
          <a
            href="/admin"
            className="text-purple-400 hover:text-purple-200 transition-colors text-xs"
          >
            Admin
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;