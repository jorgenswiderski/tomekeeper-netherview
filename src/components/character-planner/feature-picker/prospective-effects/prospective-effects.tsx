import React, { useMemo } from 'react';
import {
    ICharacterChoice,
    ICharacterOption,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/character-feature-customization-option';
import styled from '@emotion/styled';
import { GrantableEffect } from '@jorgenswiderski/tomekeeper-shared/dist/types/grantable-effect';
import { Box, Typography } from '@mui/material';
import { ChoiceDescription } from './choice-description';
import { GrantedEffects } from './granted-effects';

const EffectsContainer = styled(Box)`
    display: flex;
    flex-direction: column;
    gap: 5px;

    width: 100%;
    margin: 10px 0;
    text-align: center;
`;

const ItemBox = styled(Box)`
    display: flex;
    flex-direction: column;
    gap: 4px;

    padding: 0 0.5rem;
`;

interface ProspectiveEffectsProps {
    options: ICharacterOption | ICharacterOption[];
    text: string;
}

export function ProspectiveEffects({ options, text }: ProspectiveEffectsProps) {
    const flattenEffects = (effects: GrantableEffect[]): GrantableEffect[] => {
        return effects.flatMap((effect) => [
            effect,
            ...flattenEffects((effect.grants ?? []) as GrantableEffect[]),
        ]);
    };

    const getEffectsFromOption = (
        option: ICharacterOption,
    ): GrantableEffect[] => {
        const effects = option.grants ? [...option.grants] : [];

        if (option.choices) {
            effects.push(
                ...option.choices
                    .filter((choice) => choice.forcedOptions)
                    .flatMap((choice) => choice.forcedOptions!)
                    .flatMap((opt) => getEffectsFromOption(opt!)),
            );
        }

        return effects;
    };

    const getChoicesFromOption = (
        option: ICharacterOption,
    ): { choice: ICharacterChoice; option: ICharacterOption }[] => {
        const choices = option.choices
            ? [
                  ...option.choices
                      .filter(
                          (choice) =>
                              !(
                                  choice.forcedOptions ||
                                  (choice.count ?? 1) === choice.options.length
                              ),
                      )
                      .map((choice) => ({ choice, option })),
              ]
            : [];

        if (option.choices) {
            choices.push(
                ...option.choices
                    .filter(
                        (choice) =>
                            choice.forcedOptions ||
                            (choice.count ?? 1) === choice.options.length,
                    )
                    .flatMap((choice) => choice.forcedOptions ?? choice.options)
                    .flatMap((opt) => getChoicesFromOption(opt!)),
            );
        }

        return choices;
    };

    const effects = useMemo(() => {
        if (Array.isArray(options)) {
            return flattenEffects(
                options.flatMap((option) => getEffectsFromOption(option)),
            );
        }

        return flattenEffects(getEffectsFromOption(options) ?? []);
    }, [options]);

    const choices = useMemo(() => {
        if (Array.isArray(options)) {
            return options.flatMap((option) => getChoicesFromOption(option));
        }

        return getChoicesFromOption(options) ?? [];
    }, [options]);

    return (
        <EffectsContainer>
            <Typography variant="body2">{text}</Typography>
            <ItemBox>
                <GrantedEffects effects={effects} />
                {choices
                    .filter(({ choice }) => !choice.forcedOptions)
                    .sort((a) => ((a as any)?.level ? -1 : 1))
                    .map(({ choice, option }) => (
                        <ChoiceDescription
                            option={option}
                            choice={choice}
                            key={`${option.name}-${option.type}-${choice.type}`}
                            elevation={4}
                        />
                    ))}
            </ItemBox>
        </EffectsContainer>
    );
}
