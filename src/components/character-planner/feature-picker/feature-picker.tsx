import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardMedia, { CardMediaProps } from '@mui/material/CardMedia';
import Typography, { TypographyProps } from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { ICharacterOption } from 'planner-types/src/types/character-feature-customization-option';
import { Paper } from '@mui/material';
import styled from '@emotion/styled';
import GrantedEffect from '../granted-effect';
import { Utils } from '../../../models/utils';
import { CharacterPlannerStepDescriptions } from './types';
import { IPendingDecision } from '../../../models/character/character-states';

enum LayoutType {
    SPARSE,
    DENSE,
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    width: 100%;
    align-items: center;
    gap: 1rem;
`;

const StyledGridContainer = styled(Grid)<{ layout: LayoutType }>`
    & > .MuiGrid-item {
        padding: ${({ layout }) =>
            layout === LayoutType.DENSE ? '9px' : '12px'};

        @media (max-width: 600px) {
            padding: 6px; // Reduce to half for mobile
        }
    }
`;

const StyledGrid = styled(Grid)`
    display: flex;
`;

const StyledCard = styled(Card)<{ selected: boolean }>`
    max-width: 100%;
    opacity: ${(props) => (props.selected ? 0.85 : 1)};
    border: 3px solid ${(props) => (props.selected ? '#3f51b5' : 'transparent')};
    flex: 1;
`;

const ActionArea = styled(CardActionArea)<{ layout: LayoutType }>`
    position: relative;
    min-height: ${({ layout }) =>
        layout === LayoutType.DENSE ? '30px' : '160px'};

    @media (max-width: 600px) {
        min-height: ${({ layout }) =>
            layout === LayoutType.DENSE
                ? '30px'
                : '120px'}; // Reduced height for mobile
    }
`;

const CardMediaStyle = styled(CardMedia)`
    opacity: 0.33;

    @media (max-width: 600px) {
        height: 120px; // Matching reduced height for mobile
    }
`;

const CardMediaSparse = styled(CardMediaStyle)`
    height: 160px;
    object-fit: cover;
    object-position: center -20px;
`;

const CardMediaDense = styled(CardMediaStyle)`
    // height: 30px;
    width: 35%;
    position: absolute;
    right: 8px;
    top: -70%;
`;

interface NameLabelProps extends TypographyProps {
    layout: LayoutType;
}

const OptionName = styled(Typography)<NameLabelProps>`
    position: absolute;
    bottom: ${({ layout }) => (layout === LayoutType.DENSE ? '3px' : '8px')};
    left: 8px;
    text-shadow: 3px 3px 5px rgba(0, 0, 0, 0.7);

    @media (min-width: 600px) {
        font-size: 1rem;
    }
`;

const DescriptionText = styled(Typography)`
    min-height: 60px;
    margin: 10px 0;
    text-align: center;

    @media (min-width: 600px) {
        font-size: 1rem;
        margin: 20px 0 10px;
    }
`;

const DescriptionPaper = styled(Paper)`
    padding: 0.5rem;
`;

const EffectsContainer = styled.div`
    margin: 10px 0;
    text-align: center;
`;

const ButtonContainer = styled.div`
    text-align: center;
    margin: 10px 0 0;
    width: 100%;
`;

const NextButton = styled(Button)<{ visible: boolean }>`
    visibility: ${(props) => (props.visible ? 'visible' : 'hidden')};

    @media (max-width: 600px) {
        width: 100%;
    }
`;

interface FeaturePickerProps {
    decision: IPendingDecision;
    onEvent: (decision: IPendingDecision, choice: ICharacterOption) => void;
}

type CardMediaPropsExtended = CardMediaProps & { layout: LayoutType };

export default function FeaturePicker({
    decision,
    onEvent,
}: FeaturePickerProps) {
    const { options } = decision;

    const [selectedOption, setSelectedOption] =
        useState<ICharacterOption | null>(null);

    useEffect(() => {
        setSelectedOption(null);
    }, [options]);

    // Preload subchoice assets for the selected options
    useEffect(() => {
        if (selectedOption?.choices) {
            // Only need to preload first choice, others handled by decision queue preloader
            Utils.preloadOptionImages(selectedOption?.choices[0]?.options);
        }
    }, [selectedOption]);

    const renderCardMedia = (props: CardMediaPropsExtended) => {
        const { layout, ...restProps } = props;

        switch (layout) {
            case LayoutType.SPARSE:
                return <CardMediaSparse {...restProps} />;
            case LayoutType.DENSE:
                return <CardMediaDense {...restProps} />;
            default:
                return null;
        }
    };

    const layoutType =
        options.length < 17 ? LayoutType.SPARSE : LayoutType.DENSE;

    const gridSize =
        layoutType === LayoutType.DENSE
            ? { xs: 12, sm: 12, md: 12, lg: 6 }
            : {
                  xs: options.length < 4 ? 6 : 4,
                  sm: options.length < 4 ? 12 / options.length : 6,
                  md: options.length < 4 ? 12 / options.length : 4,
                  lg: options.length < 4 ? 12 / options.length : 3,
              };

    const showDescription = typeof selectedOption?.description === 'string';
    const showEffects =
        Utils.isNonEmptyArray(selectedOption?.grants) ||
        selectedOption?.choices?.length;

    return (
        <Container>
            <StyledGridContainer container layout={layoutType}>
                {options.map((option) => (
                    <StyledGrid item {...gridSize} key={option.name}>
                        <StyledCard
                            elevation={2}
                            selected={selectedOption === option}
                        >
                            <ActionArea
                                onClick={() => setSelectedOption(option)}
                                layout={layoutType}
                            >
                                {option.image &&
                                    renderCardMedia({
                                        component: 'img',
                                        image: option.image,
                                        layout: layoutType,
                                    })}
                                <OptionName
                                    variant="h6"
                                    component="div"
                                    layout={layoutType}
                                >
                                    {option.name}
                                </OptionName>
                            </ActionArea>
                        </StyledCard>
                    </StyledGrid>
                ))}
            </StyledGridContainer>

            {(showDescription || showEffects) && (
                <DescriptionPaper elevation={2}>
                    {showDescription && (
                        <DescriptionText variant="body2">
                            {selectedOption?.description}
                        </DescriptionText>
                    )}

                    {showEffects && (
                        <EffectsContainer>
                            <Typography
                                variant="body2"
                                style={{ margin: '0 0 5px' }}
                            >
                                You will gain:
                            </Typography>
                            {selectedOption?.grants &&
                                selectedOption.grants
                                    .filter((fx) => !fx.hidden)
                                    .map((fx) => (
                                        <GrantedEffect
                                            effect={fx}
                                            elevation={4}
                                        />
                                    ))}
                            {selectedOption?.choices &&
                                selectedOption.choices.length > 0 && (
                                    <Typography
                                        variant="body2"
                                        style={{ fontWeight: 600 }}
                                    >
                                        {CharacterPlannerStepDescriptions.get(
                                            selectedOption.choices[0].type,
                                        )}
                                    </Typography>
                                )}
                        </EffectsContainer>
                    )}
                </DescriptionPaper>
            )}

            <ButtonContainer>
                <NextButton
                    variant="contained"
                    color="primary"
                    onClick={() =>
                        selectedOption && onEvent(decision, selectedOption)
                    }
                    visible={!!selectedOption}
                >
                    Next
                </NextButton>
            </ButtonContainer>
        </Container>
    );
}
