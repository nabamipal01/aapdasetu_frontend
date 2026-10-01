export const attachHoverEvents = (
    layer,
    normalStyle,
    hoverStyle
) => {
    layer.on({
        mouseover: (event) => {
            event.target.setStyle(
                hoverStyle
            );

            event.target.bringToFront();
        },

        mouseout: (event) => {
            event.target.setStyle(
                normalStyle
            );
        },
    });
};