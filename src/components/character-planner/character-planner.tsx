import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BeatLoader } from 'react-spinners';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import styled from '@emotion/styled';
import { CharacterPlannerStep } from 'planner-types/src/types/character-feature-customization-option';
import Paper from '@mui/material/Paper';
import { Character } from '../../models/character/character';
import {
    ICharacterDecision,
    CharacterDecisionInfo,
    DecisionStateInfo,
} from '../../models/character/character-states';
import FeaturePicker from './feature-picker/feature-picker';
import { Utils } from '../../models/utils';
import {
    CharacterClassOption,
    ICharacterFeatureCustomizationOptionWithSource,
} from '../../models/character/types';
import CharacterDisplay from '../character-display/character-display';

const Container = styled('div')`
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
    width: 100%;
    min-height: 90%;
    gap: 40px;
`;

const ResetButton = styled('button')`
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
`;

const PaperContainer = styled(Paper)`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 40px 0;
    width: 45%;
    max-width: 600px;
    padding: 1rem;
    gap: 1rem;
`;

const PlannerHeader = styled(Paper)`
    width: 100%;
    text-align: center;
    padding: 1rem;
    box-sizing: border-box;
`;

interface CharacterPlannerProps {
    classData: CharacterClassOption[];
}

export default function CharacterPlanner({ classData }: CharacterPlannerProps) {
    const [character, setCharacter] = useState(new Character(classData));
    const [loading, setLoading] = useState(false);
    const nextDecision = useMemo(
        () => character.decisionQueue[0],
        [character.decisionQueue[0]],
    );
    const nextDecisionInfo = useMemo(
        () => (nextDecision ? CharacterDecisionInfo[nextDecision.type] : null),
        [nextDecision],
    );

    const loadChoices = useCallback(
        async (
            decision: ICharacterDecision,
            decisionInfo: DecisionStateInfo,
        ) => {
            if (
                decision &&
                !decision.choices &&
                decisionInfo &&
                decisionInfo.getChoices
            ) {
                setLoading(true);

                const gc = decisionInfo.getChoices as (
                    character: Character,
                ) => Promise<
                    ICharacterFeatureCustomizationOptionWithSource[][]
                >;

                const choices = (await gc(character)) ?? undefined;
                choices.forEach((choice) => Utils.preloadChoiceImages(choice));

                setCharacter((prevCharacter) => {
                    const updatedCharacter = prevCharacter.clone();
                    const updatedDecision = updatedCharacter.decisionQueue.find(
                        (cd) => cd.type === decision.type,
                    );

                    if (updatedDecision) {
                        updatedDecision.choices = choices;
                    }

                    return updatedCharacter;
                });

                setLoading(false);
            } else if (decision.choices) {
                decision.choices.forEach((choice) =>
                    Utils.preloadChoiceImages(choice),
                );
            }
        },
        [character],
    );

    useEffect(() => {
        if (nextDecision && nextDecisionInfo) {
            loadChoices(nextDecision, nextDecisionInfo);
        }
    }, [nextDecision, nextDecisionInfo]);

    useEffect(() => {
        const secondDecision = character.decisionQueue[1];

        if (secondDecision) {
            loadChoices(
                secondDecision,
                CharacterDecisionInfo[secondDecision.type],
            );
        }
    }, [character.decisionQueue[1]]);

    const handleEvent = useCallback(
        (event: CharacterPlannerStep, values: any) => {
            setCharacter((prevCharacter) =>
                prevCharacter.onEvent(event, values),
            );
        },
        [],
    );

    const levelUpCharacter = () => {
        setCharacter((prevCharacter) => prevCharacter.levelUp());
    };

    const handleReset = () => {
        setCharacter(new Character(classData)); // Reset the character to its initial state
    };

    const renderDecisionPanel = () => {
        if (!nextDecision) {
            if (character.canLevel()) {
                return (
                    <>
                        <PlannerHeader elevation={2}>
                            <Typography variant="h4">
                                Ready to level up?
                            </Typography>
                        </PlannerHeader>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={levelUpCharacter}
                        >
                            Level Up
                        </Button>
                    </>
                );
            }

            return null;
        }

        if (!nextDecisionInfo) {
            return (
                <Typography variant="h4" color="error">
                    {`Warning: Invalid decision type '${nextDecision.type}'.`}
                </Typography>
            );
        }

        if (loading || typeof nextDecision.choices === 'undefined') {
            return <BeatLoader />;
        }

        return (
            <>
                <PlannerHeader elevation={2}>
                    <Typography variant="h4">
                        {nextDecisionInfo.title}
                    </Typography>
                </PlannerHeader>
                {nextDecisionInfo.render
                    ? nextDecisionInfo.render({ onEvent: handleEvent })
                    : nextDecision.choices.map((choice) => (
                          <FeaturePicker
                              choices={choice}
                              onEvent={handleEvent}
                              event={nextDecision.type}
                          />
                      ))}
            </>
        );
    };

    return (
        <>
            <ResetButton onClick={handleReset}>Reset</ResetButton>
            <Container>
                <PaperContainer>{renderDecisionPanel()}</PaperContainer>

                {character.race && character.levels.length > 0 && (
                    <PaperContainer>
                        <CharacterDisplay character={character} />
                    </PaperContainer>
                )}
            </Container>
        </>
    );
}
