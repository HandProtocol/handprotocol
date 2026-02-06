### Sweetspot.wtf

Sweetspot is a decentralized app that streamlines impact funding, grant distribution, and community incentives. Built on Celo, it enables bulk token allocation, round creation, and transparent fund distribution with minimal gas fees. 

**Features:**
- **Bulk Allocation** – Efficiently distribute funds to multiple addresses.
- **Rounds & Sweetverse** – Create and manage funding rounds, explore past rounds, and discover ecosystem projects.
- **Dashboard** – Track active rounds and claimable tokens.
- **Admin Panel** – Manage rounds, treasury, and wallet scoring.

By leveraging smart contract automation and an intuitive UI, Sweetspot makes Web3 funding seamless, transparent, and cost-efficient.

## Problem We are trying to Solve

Impact funding, grant distribution, and community incentives often suffer from inefficiencies, high gas fees, and complex multi-wallet transactions. Many Web3 projects and DAOs struggle to distribute funds transparently and efficiently, leading to friction in onboarding new users and maintaining trust in decentralized ecosystems.

## Solution we are building

Sweetspot streamlines multi-wallet fund allocation with smart contract automation, reducing transaction overhead and making it easier to distribute funds efficiently on Celo. By integrating batch transactions and enhancing UI/UX, the platform simplifies fund allocation for impact-driven projects, DAOs, and grant programs—ensuring seamless execution while minimizing costs.

## Our mission

Our mission is to create a more accessible, efficient, and transparent way to allocate resources in Web3 ecosystems. By leveraging blockchain automation and an intuitive interface, Sweetspot empowers communities, builders, and funders to distribute capital fairly, reducing barriers to entry and fostering a more inclusive digital economy.

## Deployed Contracts

This project consists of two main smart contracts:

1. **Scorer Contract**  
   - **Celo Mainnet Address:** 0x517082d63bE128bAF9413C898a957d79E3A3A452 [`celoscan`](https://celoscan.io/address/0x517082d63bE128bAF9413C898a957d79E3A3A452)

2. **SweetSpot Contract**  
   - **Celo Mainnet Address:** 0xeC6D8F428a1e97d0988744BDeD2AE1e4b8D97344 [`celoscan`](https://celoscan.io/address/0xeC6D8F428a1e97d0988744BDeD2AE1e4b8D97344)


### Getting Started

1. Clone the repository

```sh
git clone https://github.com/HandProtocol/SweetSpot.git
cd SweetSpot
```

2. Install dependencies using pnpm

```sh
pnpm install
```

3. Copy the sample environment file and configure environment variables

```sh
cp sample.env .env
```

4. Configure the following environment variables in `.env`:

- `NEXT_PUBLIC_RAINBOW_KIT_PROJECT_ID`: Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
- `NEXT_PUBLIC_STS_TOKEN_URL`: Get from [4EVERLAND STS API](https://docs.4everland.org/storage/bucket/4ever-security-token-service-api)
- `NEXT_PUBLIC_PASSPORT_SCORER_API_KEY`: Get from [Gitcoin Passport](https://developer.passport.xyz/)

5. Start the development server

```sh
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### This repo is a fork of a starter pach that includes :

- `Rainbow Kit`, `Wagmi` & `ethers`: For connecting wallet and playing with contracts
- `Tailwindcss`: CSS Framework
- `react-hot-toast`: for in-app alerts and info popups
- `Eslint` & `Prettier` setup
- PWA functionality using `@ducanh2912/next-pwa`
- `Zustand` Library for state management
- `Mui` setup that works with tailwind CSS
- Dark mode and light mode, synced tailwindcss & mui dark mode and light mode

### Configurations for THEME :

- Configure `tailwind.config.ts`, to add extend colors variables.
- Use `globals.css` to define variable colors for light mode and dark mode, but add dark mode variable colors in `[data-theme='dark']` and light mode variable colors in `:root`
- configure `darkTheme` and `lightTHeme` in `MuiThemeWrapper.tsx` to theme mui components
- Use `const {theme, toggleTheme} = useTheme()` from `TailwindThemeProvider.tsx` to get the current theme and toggle the theme.

### PWA Setup out of box :

- Configure `public/manifest.json` as per your app , to change app name and app icon for your PWA app.
