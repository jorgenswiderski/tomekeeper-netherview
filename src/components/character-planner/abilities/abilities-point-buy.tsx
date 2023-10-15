// abilities-point-buy.tsx

import React, { useState, useMemo } from 'react';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import { ICharacterFeatureCustomizationOption } from 'planner-types/src/types/character-feature-customization-option';
import {
    GrantableEffectType,
    GrantableEffectSubtype,
} from 'planner-types/src/types/grantable-effect';
import AbilitiesUI from './abilities-ui';
import { AbilityScores } from '../../../models/character/types';
import { AbilitiesBonusType, AbilitiesCostMode } from './types';

// using 'any' here to resolve cyclic dependency with character-states.tsx
interface CharacterWidgetProps {
    onDecision: (
        decision: any,
        value: ICharacterFeatureCustomizationOption,
    ) => void;
    decision: any;
}

export default function AbilitiesPointBuy({
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
        const choice: ICharacterFeatureCustomizationOption = {
            name: 'Set Ability Scores',
            grants: [
                {
                    name: 'Base Ability Scores',
                    type: GrantableEffectType.CHARACTERISTIC,
                    subtype: GrantableEffectSubtype.ABILITY_BASE,
                    hidden: true,
                    values: { ...pointBuyScores },
                },
                {
                    name: 'Racial Ability Score Bonuses',
                    type: GrantableEffectType.CHARACTERISTIC,
                    subtype: GrantableEffectSubtype.ABILITY_RACIAL,
                    hidden: true,
                    values: { ...bonuses[AbilitiesBonusType.RACIAL] },
                },
            ],
        };

        // Call the event with the abilities and the racial bonuses
        onDecision(decision, choice);
    };

    return (
        <div>
            <AbilitiesUI
                costMode={AbilitiesCostMode.INCREMENTAL}
                onDecision={handleConfirm}
                bonuses={bonuses}
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
        </div>
    );
}
