/* eslint-disable react/jsx-props-no-spreading */
// _app.tsx
import React from 'react';
import '../styles/global.css';
import { AppProps } from 'next/app';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../models/theme';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { CharacterProvider } from '../context/character-context/character-context';
import { GameDataProvider } from '../context/game-data-context/game-data-context';
import { initCharacterTreeActionCompressor } from '../models/character/character-tree-node/character-tree-action';
import { initCharacterTreeActionEffectRef } from '../models/character/character-tree-node/character-tree-action-effect';
import { initCharacterTreeSpellEffectRef } from '../models/character/character-tree-node/character-tree-spell-effect';
import { NotificationProvider } from '../context/notification-context/notification-context';
import { SettingsProvider } from '../context/user-settings-context/user-settings-context';
import { AppHead } from '../components/head';
import { initCharacterTreePassiveRef } from '../models/character/character-tree-node/character-tree-passive';

initCharacterTreeActionEffectRef();
initCharacterTreeSpellEffectRef();
initCharacterTreeActionCompressor();
initCharacterTreePassiveRef();

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider theme={theme}>
            <AppHead />

            <GameDataProvider>
                <CharacterProvider>
                    <NotificationProvider>
                        <SettingsProvider>
                            <Component {...pageProps} />
                        </SettingsProvider>
                    </NotificationProvider>
                </CharacterProvider>
            </GameDataProvider>
        </ThemeProvider>
    );
}

export default MyApp;
