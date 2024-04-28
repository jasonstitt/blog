---
date: 2010-05-03
title: YouTube video embedding with XSLT
---

A while ago, I published an article on how to use Python's docutils to expand some markup in reStructuredText into the HTML for a YouTube embedded video. Just for fun, here's an XSLT stylesheet that does something similar. It hasn't had a chance to be used in production, but if you have an XSLT-based web application, it might come in useful.

```xslt youtube.inc.xslt
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns="http://www.w3.org/1999/xhtml">

    <!-- Replaces elements of thei form <youtube id="asdfasdf" /> with the
    correct XHTML object element to embed a YouTube video -->

    <!-- If desired, one can also place arbitrary elements inside the youtube
    element that will be converted into parameters of the object element.
    E.g. the element <fullscreen>true</fullscreen> will be converted to
    <param name="fullscreen" value="true" /> -->

    <xsl:strip-space elements="youtube"/>

    <xsl:template match="youtube">
        <xsl:element name="object">
            <xsl:attribute name="type">application/x-shockwave-flash</xsl:attribute>
            <xsl:attribute name="width">425</xsl:attribute>
            <xsl:attribute name="height">344</xsl:attribute>
            <xsl:attribute name="class">youtube-embed</xsl:attribute>
            <xsl:attribute name="data">
                http://www.youtube.com/v/<xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:element name="param">
                <xsl:attribute name="name">movie</xsl:attribute>
                <xsl:attribute name="value">
                    http://www.youtube.com/v/<xsl:value-of select="@id"/>
                </xsl:attribute>
            </xsl:element>
            <xsl:element name="param">
                <xsl:attribute name="name">wmode</xsl:attribute>
                <xsl:attribute name="value">transparent</xsl:attribute>
            </xsl:element>
            <xsl:apply-templates mode="youtube-params" />
        </xsl:element>
    </xsl:template>

    <xsl:template match="youtube/*" mode="youtube-params">
        <xsl:element name="param">
            <xsl:attribute name="name"><xsl:value-of select="local-name()" /></xsl:attribute>
            <xsl:attribute name="value"><xsl:value-of select="text()" /></xsl:attribute>
        </xsl:element>
    </xsl:template>

</xsl:stylesheet>

```

As the comment notes, you need to run this on an XML document that contains elements like `<youtube id="asdfasdf" />`. It's not currently configurable as to the width, height, and other parameters (except by changing the XSLT) but could be made so.
