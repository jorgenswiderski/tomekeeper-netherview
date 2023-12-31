import React, { useState, useMemo, useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import {
    CharacterPlannerStep,
    ICharacterOption,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/character-feature-customization-option';
import { Paper, Box, Typography } from '@mui/material';
import { ISpell } from '@jorgenswiderski/tomekeeper-shared/dist/types/action';
import { ICharacter } from '../../models/character/types';
import { PlannerHeader } from './planner-header/planner-header';
import { SpellIconCard } from '../icon-cards/spell-icon-card';
import { SpellsByLevel } from '../spells-by-level';
import { useFeaturePicker } from './feature-picker/use-feature-picker';
import { IPendingDecision } from '../../models/character/character-states';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    flex: 1;
    width: 100%;
    align-items: center;
    gap: 1rem;
`;

const RowInnerBox = styled(Box)`
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
`;

const SelectedBoxPaper = styled(Paper)`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding: 1rem;
    gap: 0.5rem;
`;

interface SelectedSpellsProps {
    spells: ISpell[];
    numSpells: number;
    onClick: (spell: ISpell) => void;
    type: CharacterPlannerStep;
}

function SelectedSpells({
    spells,
    numSpells,
    onClick,
    type,
}: SelectedSpellsProps) {
    return (
        <SelectedBoxPaper elevation={2}>
            <Typography>
                {`Select ${numSpells > 1 ? numSpells : 'a'} ${
                    type === CharacterPlannerStep.LEARN_SPELLS
                        ? 'spell'
                        : 'cantrip'
                }${numSpells > 1 ? 's' : ''} to learn.`}
            </Typography>
            <RowInnerBox>
                {Array.from({ length: numSpells }).map((_, idx) => {
                    const spell = spells[idx];

                    return (
                        <SpellIconCard
                            // eslint-disable-next-line react/no-array-index-key
                            key={idx}
                            spell={spell}
                            selected={spells.includes(spell)}
                            onClick={() => onClick(spell)}
                            elevation={4} // boost elevation slightly for better contrast on empty card
                        />
                    );
                })}
            </RowInnerBox>
        </SelectedBoxPaper>
    );
}

interface SpellPickerProps {
    title: string;
    onDecision: (decision: IPendingDecision, value: ICharacterOption[]) => void;
    decision: IPendingDecision;
    character: ICharacter;
}

export function SpellPicker({
    title,
    onDecision,
    decision,
    character,
}: SpellPickerProps) {
    const { count: numSpells } = decision;
    const { filteredOptions: options } = useFeaturePicker(decision);

    const [selectedSpells, setSelectedSpells] = useState<ISpell[]>([]);

    const spells = useMemo(() => {
        return options.flatMap((option: ICharacterOption) => {
            const spell = character.spellData.find(
                (spell2) => spell2.name === option.name,
            );

            if (!spell) {
                throw new Error(`could not find spell ${option.name}`);
            }

            return spell!;
        });
    }, [options]);

    const resultOptions = useMemo(
        () =>
            selectedSpells.map(
                (spell) =>
                    options.find(
                        (opt: ICharacterOption) => opt.name === spell.name,
                    )!,
            ),
        [selectedSpells],
    );

    const handleSpellClick = (spell: ISpell) => {
        if (selectedSpells.includes(spell)) {
            setSelectedSpells((oldSpells) =>
                oldSpells.filter((s) => s !== spell),
            );
        } else if (selectedSpells.length === numSpells) {
            setSelectedSpells((oldSpells) => [
                ...oldSpells.slice(1, numSpells),
                spell,
            ]);
        } else {
            setSelectedSpells((oldSpells) => [...oldSpells, spell]);
        }
    };

    const handleConfirm = useCallback(() => {
        onDecision(decision, resultOptions);
    }, [resultOptions]);

    useEffect(() => setSelectedSpells([]), [decision]);

    return (
        <>
            <PlannerHeader
                title={title}
                onButtonClick={handleConfirm}
                buttonDisabled={selectedSpells.length !== numSpells}
            />

            <Container>
                <SelectedSpells
                    spells={selectedSpells}
                    numSpells={numSpells}
                    onClick={handleSpellClick}
                    type={decision.type}
                />

                <SpellsByLevel
                    spells={spells}
                    selectedSpells={selectedSpells}
                    onClick={handleSpellClick}
                />
            </Container>
        </>
    );
}
