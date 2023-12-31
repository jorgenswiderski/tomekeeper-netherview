// abilities-point-buy.tsx

import React, { useState, useMemo } from 'react';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import { ICharacterOption } from '@jorgenswiderski/tomekeeper-shared/dist/types/character-feature-customization-option';
import {
    GrantableEffectType,
    PassiveType,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/grantable-effect';
import { AbilitiesUI } from './abilities-ui';
import { AbilityScores } from '../../../models/character/types';
import { AbilitiesBonusType, AbilitiesCostMode } from './types';
import { IPendingDecision } from '../../../models/character/character-states';

interface CharacterWidgetProps {
    title: string;
    onDecision: (decision: IPendingDecision, value: ICharacterOption) => void;
    decision: IPendingDecision;
}

export function AbilitiesPointBuy({
    title,
    onDecision,
    decision,
}: CharacterWidgetProps) {
    const options: (keyof AbilityScores)[] = [
        'Strength',
        'Dexterity',
        'Constitution',
        'Intelligence',
        'Wisdom',
        'Charisma',
    ];

    const [bonusTwo, setBonusTwo] = useState<keyof AbilityScores | null>(
        'Dexterity',
    );

    const [bonusOne, setBonusOne] = useState<keyof AbilityScores | null>(
        'Strength',
    );

    const bonuses: Record<
        AbilitiesBonusType,
        Partial<AbilityScores>
    > = useMemo(() => {
        const b: Partial<AbilityScores> = {};

        if (bonusOne) {
            b[bonusOne] = 1;
        }

        if (bonusTwo) {
            b[bonusTwo] = 2;
        }

        return { [AbilitiesBonusType.RACIAL]: b };
    }, [bonusOne, bonusTwo]);

    const handleConfirm = (pointBuyScores: AbilityScores) => {
        const choice: ICharacterOption = {
            name: 'Set Ability Scores',
            grants: [
                {
                    name: 'Base Ability Scores',
                    type: GrantableEffectType.PASSIVE,
                    subtype: PassiveType.ABILITY_BASE,
                    hidden: true,
                    values: { ...pointBuyScores },
                },
                {
                    name: 'Racial Ability Score Bonuses',
                    type: GrantableEffectType.PASSIVE,
                    subtype: PassiveType.ABILITY_RACIAL,
                    hidden: true,
                    values: { ...bonuses[AbilitiesBonusType.RACIAL] },
                },
            ],
        };

        // Call the event with the abilities and the racial bonuses
        onDecision(decision, choice);
    };

    return (
        <AbilitiesUI
            title={title}
            costMode={AbilitiesCostMode.INCREMENTAL}
            onDecision={handleConfirm}
            bonuses={bonuses}
            abilities={{
                Strength: 15,
                Dexterity: 14,
                Constitution: 14,
                Intelligence: 8,
                Wisdom: 12,
                Charisma: 8,
            }}
        >
            <Box mt={2}>
                <Typography>+2 Racial Bonus:</Typography>
                <Select
                    value={bonusTwo || ''}
                    onChange={(e) =>
                        setBonusTwo(e.target.value as keyof AbilityScores)
                    }
                    fullWidth
                >
                    <MenuItem value="">
                        <em>Select Ability</em>
                    </MenuItem>
                    {options
                        .filter((ability) => ability !== bonusOne)
                        .map((ability) => (
                            <MenuItem key={ability} value={ability}>
                                {ability}
                            </MenuItem>
                        ))}
                </Select>
            </Box>

            <Box mt={2}>
                <Typography>+1 Racial Bonus:</Typography>
                <Select
                    value={bonusOne || ''}
                    onChange={(e) =>
                        setBonusOne(e.target.value as keyof AbilityScores)
                    }
                    fullWidth
                >
                    <MenuItem value="">
                        <em>Select Ability</em>
                    </MenuItem>
                    {options
                        .filter((ability) => ability !== bonusTwo)
                        .map((ability) => (
                            <MenuItem key={ability} value={ability}>
                                {ability}
                            </MenuItem>
                        ))}
                </Select>
            </Box>
        </AbilitiesUI>
    );
}
